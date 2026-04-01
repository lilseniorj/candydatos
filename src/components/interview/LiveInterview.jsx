import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import useAudioCapture from '../../hooks/useAudioCapture'
import useVideoCapture from '../../hooks/useVideoCapture'
import useAudioPlayback from '../../hooks/useAudioPlayback'
import { createInterviewSession } from '../../services/geminiLive'
import { evaluateInterview } from '../../services/interviewEvaluator'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

const INTERVIEW_DURATION = 120 // seconds
const WRAP_UP_AT = 15 // seconds before end

// ─── Timer bar component ────────────────────────────────────────────────────
function TimerBar({ remaining, total }) {
  const pct = (remaining / total) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const color = remaining > 60 ? 'bg-green-500' : remaining > 30 ? 'bg-yellow-500' : 'bg-red-500'
  const pulse = remaining <= 10 && remaining > 0 ? 'animate-pulse' : ''

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${remaining <= 30 ? 'text-red-400' : 'text-gray-400'}`}>
          {remaining <= 0 ? '00:00' : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color} ${pulse}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function LiveInterview({ job, resumeData, fitScore, onComplete }) {
  const { t, i18n } = useTranslation()

  // State machine
  const [state, setState] = useState('idle') // idle | permissions | connecting | active | ending | processing | complete | error
  const [remaining, setRemaining] = useState(INTERVIEW_DURATION)
  const [error, setError]         = useState('')
  const [aiSpeaking, setAiSpeaking] = useState(false)

  // Refs
  const sessionRef    = useRef(null)
  const transcriptRef = useRef([])
  const timerRef      = useRef(null)
  const wrapUpSent    = useRef(false)

  // Hooks
  const audio    = useAudioCapture()
  const video    = useVideoCapture()
  const playback = useAudioPlayback()

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      audio.stopCapture()
      video.stopCapture()
      playback.stopPlayback()
      sessionRef.current?.close()
    }
  }, [])

  // ── Timer tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'active') return
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        // Send wrap-up signal
        if (next === WRAP_UP_AT && !wrapUpSent.current) {
          wrapUpSent.current = true
          sessionRef.current?.sendText('WRAP_UP — You have 15 seconds left. Please deliver a brief thank-you closing now.')
        }
        // Time's up
        if (next <= 0) {
          endInterview()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state])

  // ── Start interview ───────────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    setState('permissions')
    setError('')
    try {
      // Request permissions
      const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

      setState('connecting')
      const session = await createInterviewSession({
        job,
        resumeData,
        fitScore,
        lang,
        onAudio: (b64) => {
          setAiSpeaking(true)
          playback.enqueueAudio(b64)
        },
        onTranscript: (role, text) => {
          transcriptRef.current.push({ role, text, ts: Date.now() })
        },
        onInterrupted: () => {
          playback.stopPlayback()
          setAiSpeaking(false)
        },
        onError: (err) => {
          console.error('Interview session error:', err)
          setError(err?.message || String(err))
          setState('error')
        },
        onClose: () => {
          console.info('Interview session closed')
        },
      })

      sessionRef.current = session

      // Start audio capture → send to Gemini
      await audio.startCapture((pcm16) => {
        session.sendAudio(pcm16)
        setAiSpeaking(false)
      })

      // Start video capture → send frames to Gemini
      await video.startCapture((jpeg) => {
        session.sendVideo(jpeg)
      })

      setState('active')
      setRemaining(INTERVIEW_DURATION)
    } catch (err) {
      console.error('Failed to start interview:', err)
      setError(err?.message || t('candidate.interview.permissionError'))
      setState('error')
    }
  }, [job, resumeData, fitScore, i18n.language])

  // ── End interview ─────────────────────────────────────────────────────
  const endInterview = useCallback(async () => {
    if (state === 'ending' || state === 'processing' || state === 'complete') return
    setState('ending')
    clearInterval(timerRef.current)

    // Stop all streams
    audio.stopCapture()
    video.stopCapture()
    playback.stopPlayback()
    sessionRef.current?.close()
    sessionRef.current = null

    // Process results
    setState('processing')
    try {
      const lang = i18n.language?.startsWith('es') ? 'es' : 'en'
      const result = await evaluateInterview({
        transcript: transcriptRef.current,
        job,
        resumeData,
        fitScore,
        lang,
      })

      // Add transcript to result for storage
      result.transcript = transcriptRef.current
      setState('complete')
      onComplete(result)
    } catch (err) {
      console.error('Interview evaluation failed:', err)
      // Still complete with a basic result
      onComplete({
        passed: false,
        score: 0,
        feedback: t('candidate.interview.evalError'),
        trait_scores: {},
        transcript: transcriptRef.current,
      })
      setState('complete')
    }
  }, [state, job, resumeData, fitScore, onComplete, i18n.language])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Idle state ─────────────────────────────────────────────────── */}
      {state === 'idle' && (
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🎥</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('candidate.interview.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 max-w-md mx-auto">{t('candidate.interview.description')}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">⏱ 2 min</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">🎤 {t('candidate.interview.micRequired')}</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">📷 {t('candidate.interview.camRequired')}</span>
          </div>
          <Button onClick={startInterview}>{t('candidate.interview.start')}</Button>
        </Card>
      )}

      {/* ── Connecting ─────────────────────────────────────────────────── */}
      {(state === 'permissions' || state === 'connecting') && (
        <Card className="p-8 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-brand-500 mt-4">
            {state === 'permissions' ? t('candidate.interview.requestingAccess') : t('candidate.interview.connecting')}
          </p>
        </Card>
      )}

      {/* ── Active interview ───────────────────────────────────────────── */}
      {state === 'active' && (
        <div className="space-y-3">
          {/* Timer */}
          <Card className="p-4">
            <TimerBar remaining={remaining} total={INTERVIEW_DURATION} />
          </Card>

          {/* Video feed */}
          <Card className="p-0 overflow-hidden relative">
            <video
              ref={video.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video bg-gray-900 object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Status overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                aiSpeaking
                  ? 'bg-brand-500/80 text-white'
                  : 'bg-gray-900/60 text-gray-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${aiSpeaking ? 'bg-white animate-pulse' : 'bg-green-400 animate-pulse'}`} />
                {aiSpeaking ? t('candidate.interview.aiSpeaking') : t('candidate.interview.yourTurn')}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/60 text-white text-xs font-medium backdrop-blur-sm">
                🔴 {t('candidate.interview.recording')}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Ending / Processing ────────────────────────────────────────── */}
      {(state === 'ending' || state === 'processing') && (
        <Card className="p-8 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-brand-500 mt-4">
            {state === 'ending' ? t('candidate.interview.ending') : t('candidate.interview.processing')}
          </p>
        </Card>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {state === 'error' && (
        <Card className="p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-red-500 mb-4">{error || t('candidate.interview.genericError')}</p>
          <Button onClick={() => { setState('idle'); setError('') }}>{t('candidate.interview.retry')}</Button>
        </Card>
      )}
    </div>
  )
}
