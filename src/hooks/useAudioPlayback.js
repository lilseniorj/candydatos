import { useRef, useState, useCallback } from 'react'

/**
 * Hook that plays back PCM16 audio from Gemini Live API.
 *
 * Key design: exposes the AudioContext and a GainNode so that the
 * recording system can tap into the same output (no manual injection).
 *
 * Pattern from reference: outputNode → speakers (ctx.destination)
 *                         outputNode → recordingDestination
 */
export default function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false)
  const ctxRef       = useRef(null)
  const gainRef      = useRef(null) // GainNode all audio passes through
  const nextTime     = useRef(0)
  const sourcesRef   = useRef(new Set())

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: 24000 })
      const gain = ctxRef.current.createGain()
      gain.connect(ctxRef.current.destination)
      gainRef.current = gain
      nextTime.current = 0
    }
    return ctxRef.current
  }, [])

  const enqueueAudio = useCallback((pcm16Base64) => {
    const ctx = getCtx()
    if (!gainRef.current) return

    const binary = atob(pcm16Base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const int16 = new Int16Array(bytes.buffer)

    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    // Connect to gain node (which goes to speakers + optionally recording)
    source.connect(gainRef.current)

    const now = ctx.currentTime
    const startAt = Math.max(now, nextTime.current)
    source.start(startAt)
    nextTime.current = startAt + buffer.duration
    sourcesRef.current.add(source)

    setIsPlaying(true)
    source.onended = () => {
      sourcesRef.current.delete(source)
      if (ctx.currentTime >= nextTime.current - 0.05) setIsPlaying(false)
    }
  }, [getCtx])

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop() } catch {} })
    sourcesRef.current.clear()
    nextTime.current = 0
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close()
    }
    ctxRef.current = null
    gainRef.current = null
    setIsPlaying(false)
  }, [])

  return {
    enqueueAudio,
    stopPlayback,
    isPlaying,
    /** The AudioContext (24kHz) — use to create MediaStreamDestination for recording */
    getAudioContext: getCtx,
    /** The GainNode all Gemini audio passes through — connect recording destination to this */
    gainNode: gainRef,
  }
}
