import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import useAudioCapture from '../../hooks/useAudioCapture'
import useAudioPlayback from '../../hooks/useAudioPlayback'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase/config'
import { createInterviewSession } from '../../services/geminiLive'
import { evaluateInterview } from '../../services/interviewEvaluator'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

const INTERVIEW_DURATION = 120
const WRAP_UP_AT = 10

// ─── Timer bar ──────────────────────────────────────────────────────────────
function TimerBar({ remaining, total }) {
  const pct = (remaining / total) * 100
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const color = remaining > 60 ? 'bg-green-500' : remaining > 30 ? 'bg-yellow-500' : 'bg-red-500'
  const pulse = remaining <= 10 && remaining > 0 ? 'animate-pulse' : ''
  return (
    <div className="space-y-1">
      <span className={`text-xs font-medium ${remaining <= 30 ? 'text-red-400' : 'text-gray-400'}`}>
        {remaining <= 0 ? '00:00' : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`}
      </span>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color} ${pulse}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Audio level indicator ──────────────────────────────────────────────────
function AudioLevel({ stream }) {
  const [level, setLevel] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const s = stream instanceof MediaStream ? stream : stream?.current
    if (!s || !s.getAudioTracks().length) return
    let ctx
    try { ctx = new AudioContext() } catch { return }
    const src = ctx.createMediaStreamSource(s)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      setLevel(Math.min(100, (data.reduce((a, b) => a + b, 0) / data.length) * 1.5))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(rafRef.current); ctx.close() }
  }, [stream])

  return (
    <div className="flex items-center gap-1">
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`w-1.5 rounded-full transition-all duration-100 ${
          level > i * 12 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        }`} style={{ height: `${8 + i * 3}px` }} />
      ))}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function LiveInterview({ job, resumeData, fitScore, candidateName, applicationId, onComplete }) {
  const { t, i18n } = useTranslation()

  // State: idle → checking → ready → connecting → active → ending → processing → complete | error
  const [state, setState]           = useState('idle')
  const [remaining, setRemaining]   = useState(INTERVIEW_DURATION)
  const [error, setError]           = useState('')
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [micOk, setMicOk]           = useState(false)
  const [camOk, setCamOk]           = useState(false)
  const [interviewLang, setInterviewLang] = useState(i18n.language?.startsWith('es') ? 'es' : 'en')

  // Single shared stream for check + interview
  const mediaStreamRef = useRef(null)
  const videoElRef     = useRef(null)
  const canvasRef      = useRef(null)
  const frameInterval  = useRef(null)

  const sessionRef    = useRef(null)
  const transcriptRef = useRef([])
  const timerRef      = useRef(null)
  const wrapUpSent    = useRef(false)
  const recorderRef   = useRef(null)
  const chunksRef     = useRef([])

  const audio    = useAudioCapture()
  const playback = useAudioPlayback()

  // ── Cleanup ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearInterval(frameInterval.current)
      audio.stopCapture()
      playback.stopPlayback()
      mediaStreamRef.current?.getTracks().forEach(t => t.stop())
      sessionRef.current?.close()
    }
  }, [])

  // ── Attach stream to video element whenever both exist ────────────────
  useEffect(() => {
    if (videoElRef.current && mediaStreamRef.current) {
      videoElRef.current.srcObject = mediaStreamRef.current
      videoElRef.current.play().catch(() => {})
    }
  }, [state]) // re-run when state changes (element may appear)

  // ── Step 1: Check devices ─────────────────────────────────────────────
  const startChecking = useCallback(async () => {
    setState('checking')
    setError('')
    setMicOk(false)
    setCamOk(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      mediaStreamRef.current = stream
      setMicOk(stream.getAudioTracks()[0]?.readyState === 'live')
      setCamOk(stream.getVideoTracks()[0]?.readyState === 'live')
      setState('ready')
    } catch (err) {
      console.error('Device check failed:', err)
      setError(t('candidate.interview.permissionError'))
      setState('error')
    }
  }, [t])

  // ── Step 2: Start interview (reuse same stream) ───────────────────────
  const startInterview = useCallback(async () => {
    setState('connecting')
    setError('')
    try {
      const session = await createInterviewSession({
        job, resumeData, fitScore, candidateName,
        lang: interviewLang,
        onAudio: (b64) => {
          setAiSpeaking(true)
          playback.enqueueAudio(b64)
          // Audio goes through playback.gainNode → speakers + recording destination automatically
        },
        onTranscript: (role, text) => { transcriptRef.current.push({ role, text, ts: Date.now() }) },
        onInterrupted: () => { playback.stopPlayback(); setAiSpeaking(false) },
        onError: (err) => { console.error('Session error:', err); setError(err?.message || String(err)); setState('error') },
        onClose: () => { console.info('Session closed') },
      })
      sessionRef.current = session

      // Start mic capture → Gemini
      await audio.startCapture((pcm16) => { session.sendAudio(pcm16); setAiSpeaking(false) })

      // Start video frame capture at 1 FPS → Gemini
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
        canvasRef.current.width = 640
        canvasRef.current.height = 480
      }
      frameInterval.current = setInterval(() => {
        if (!videoElRef.current || !canvasRef.current || !sessionRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        ctx.drawImage(videoElRef.current, 0, 0, 640, 480)
        const b64 = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1]
        session.sendVideo(b64)
      }, 1000)

      // Start recording — same pattern as reference: playback.gainNode → recordingDest + speakers
      // Mic audio also goes into the same destination. Single AudioContext, no resampleo, no echo.
      try {
        const outputCtx = playback.getAudioContext() // 24kHz AudioContext
        const gainNode = playback.gainNode.current

        if (outputCtx && gainNode) {
          // Create a MediaStreamDestination on the SAME AudioContext as playback
          const recDest = outputCtx.createMediaStreamDestination()

          // Route Gemini audio (through gainNode) into recording destination
          gainNode.connect(recDest)

          // Also route mic audio into the same destination
          const micForRec = outputCtx.createMediaStreamSource(mediaStreamRef.current)
          micForRec.connect(recDest)

          // Combine: video track from camera + mixed audio track from destination
          const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
          const mixedAudioTrack = recDest.stream.getAudioTracks()[0]
          const recStream = new MediaStream([videoTrack, mixedAudioTrack].filter(Boolean))

          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
              ? 'video/webm;codecs=vp8,opus'
              : 'video/webm'
          chunksRef.current = []
          const recorder = new MediaRecorder(recStream, { mimeType })
          recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
          recorder.start(1000)
          recorderRef.current = recorder
          console.info('[Interview] Recording started — single AudioContext mix:', mimeType)
        }
      } catch (err) {
        console.warn('[Interview] Recording setup failed:', err)
      }

      // Trigger Gemini to start speaking immediately — greet the candidate by name
      session.sendText(`The interview has started. Greet ${candidateName || 'the candidate'} by their first name right now and ask your first question immediately.`)

      setState('active')
      setRemaining(INTERVIEW_DURATION)
    } catch (err) {
      console.error('Failed to start:', err)
      setError(err?.message || t('candidate.interview.genericError'))
      setState('error')
    }
  }, [job, resumeData, fitScore, candidateName, interviewLang])

  // ── Timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'active') return
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        if (next === WRAP_UP_AT && !wrapUpSent.current) {
          wrapUpSent.current = true
          sessionRef.current?.sendText('WRAP_UP')
        }
        if (next <= 0) { endInterview(); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state])

  // ── End interview ─────────────────────────────────────────────────────
  const endInterview = useCallback(async () => {
    if (state === 'ending' || state === 'processing' || state === 'complete') return
    setState('ending')
    clearInterval(timerRef.current)
    clearInterval(frameInterval.current)
    audio.stopCapture()
    playback.stopPlayback()
    sessionRef.current?.close()
    sessionRef.current = null

    // Stop recorder and get video blob
    let videoUrl = null
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      await new Promise(resolve => {
        recorderRef.current.onstop = resolve
        recorderRef.current.stop()
      })
      console.info('[Interview] Recording stopped, chunks:', chunksRef.current.length)
    }

    // Stop camera/mic
    mediaStreamRef.current?.getTracks().forEach(t => t.stop())
    mediaStreamRef.current = null

    setState('processing')

    // Upload recording to Firebase Storage
    if (chunksRef.current.length > 0 && applicationId) {
      try {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        console.info('[Interview] Uploading recording:', (blob.size / 1024 / 1024).toFixed(1), 'MB')
        const storageRef = ref(storage, `interviews/${applicationId}/interview.webm`)
        await uploadBytes(storageRef, blob)
        videoUrl = await getDownloadURL(storageRef)
        console.info('[Interview] Recording uploaded:', videoUrl)
      } catch (err) {
        console.error('[Interview] Failed to upload recording:', err)
      }
    }

    // Evaluate transcript
    try {
      const result = await evaluateInterview({
        transcript: transcriptRef.current, job, resumeData, fitScore,
        lang: interviewLang,
      })
      result.transcript = transcriptRef.current
      if (videoUrl) result.video_url = videoUrl
      setState('complete')
      onComplete(result)
    } catch (err) {
      console.error('Eval failed:', err)
      const fallback = { passed: false, score: 0, feedback: t('candidate.interview.evalError'), trait_scores: {}, transcript: transcriptRef.current }
      if (videoUrl) fallback.video_url = videoUrl
      onComplete(fallback)
      setState('complete')
    }
  }, [state, job, resumeData, fitScore, onComplete, interviewLang, applicationId])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Idle ───────────────────────────────────────────────────────── */}
      {state === 'idle' && (
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🎥</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('candidate.interview.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">{t('candidate.interview.description')}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-4 text-xs">
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">⏱ 2 min</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">🎤 {t('candidate.interview.micRequired')}</span>
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">📷 {t('candidate.interview.camRequired')}</span>
          </div>

          {/* Language selector */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('candidate.interview.selectLang')}:</span>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {[{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }].map(l => (
                <button key={l.code} onClick={() => setInterviewLang(l.code)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    interviewLang === l.code
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>{l.label}</button>
              ))}
            </div>
          </div>

          <Button onClick={startChecking}>{t('candidate.interview.checkDevices')}</Button>
        </Card>
      )}

      {/* ── Checking ───────────────────────────────────────────────────── */}
      {state === 'checking' && (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('candidate.interview.requestingAccess')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('candidate.interview.allowBrowser')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Ready: preview + confirm ───────────────────────────────────── */}
      {state === 'ready' && (
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <video ref={videoElRef} autoPlay playsInline muted
              className="w-full aspect-video bg-gray-900 object-cover"
              style={{ transform: 'scaleX(-1)' }} />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('candidate.interview.deviceCheck')}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('candidate.interview.camera')}</span>
                </div>
                {camOk
                  ? <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('candidate.interview.working')}</span>
                  : <span className="text-xs font-medium text-red-500">{t('candidate.interview.notDetected')}</span>
                }
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎤</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('candidate.interview.microphone')}</span>
                </div>
                <div className="flex items-center gap-3">
                  {micOk ? (
                    <>
                      <AudioLevel stream={mediaStreamRef.current} />
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500" /> {t('candidate.interview.working')}</span>
                    </>
                  ) : <span className="text-xs font-medium text-red-500">{t('candidate.interview.notDetected')}</span>}
                </div>
              </div>
            </div>
            {micOk && camOk && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-4 text-center font-medium">✅ {t('candidate.interview.devicesReady')}</p>
            )}

            {/* Language reminder */}
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('candidate.interview.langLabel')}: <strong>{interviewLang === 'es' ? 'Español' : 'English'}</strong>
              </span>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => {
              mediaStreamRef.current?.getTracks().forEach(t => t.stop())
              mediaStreamRef.current = null
              setState('idle')
            }}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={startInterview} disabled={!micOk || !camOk}>
              🎥 {t('candidate.interview.start')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Connecting ─────────────────────────────────────────────────── */}
      {state === 'connecting' && (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-3xl">🎤</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md">
                <Spinner size="sm" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('candidate.interview.connecting')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('candidate.interview.connectingHint')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Active ─────────────────────────────────────────────────────── */}
      {state === 'active' && (
        <div className="space-y-3">
          <Card className="p-4">
            <TimerBar remaining={remaining} total={INTERVIEW_DURATION} />
          </Card>
          <Card className="p-0 overflow-hidden relative">
            <video ref={videoElRef} autoPlay playsInline muted
              className="w-full aspect-video bg-gray-900 object-cover"
              style={{ transform: 'scaleX(-1)' }} />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                aiSpeaking ? 'bg-brand-500/80 text-white' : 'bg-gray-900/60 text-gray-200'
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

      {/* ── Ending ──────────────────────────────────────────────────────── */}
      {state === 'ending' && (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center animate-pulse">
              <span className="text-2xl">🎬</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('candidate.interview.ending')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('candidate.interview.savingVideo')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Processing ───────────────────────────────────────────────────── */}
      {state === 'processing' && (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <span className="text-3xl">🧠</span>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{t('candidate.interview.analyzing')}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{t('candidate.interview.analyzingHint')}</p>
            </div>
            {/* Animated steps */}
            <div className="flex flex-col gap-2 text-xs text-left w-full max-w-xs">
              <div className="flex items-center gap-2 text-green-500"><span>✓</span> {t('candidate.interview.stepRecording')}</div>
              <div className="flex items-center gap-2 text-green-500"><span>✓</span> {t('candidate.interview.stepUpload')}</div>
              <div className="flex items-center gap-2 text-brand-500 animate-pulse"><Spinner size="sm" /> {t('candidate.interview.stepEval')}</div>
            </div>
          </div>
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
