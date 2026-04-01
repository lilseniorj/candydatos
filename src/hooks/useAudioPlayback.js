import { useRef, useState, useCallback } from 'react'

/**
 * Hook that plays back PCM16 audio chunks from Gemini Live API.
 * Input: base64-encoded PCM16 at 24kHz mono.
 */
export default function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false)
  const ctxRef    = useRef(null)
  const nextTime  = useRef(0)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: 24000 })
      nextTime.current = 0
    }
    return ctxRef.current
  }, [])

  const enqueueAudio = useCallback((pcm16Base64) => {
    const ctx = getCtx()
    // Decode base64 to Int16Array
    const binary = atob(pcm16Base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const int16 = new Int16Array(bytes.buffer)

    // Convert Int16 to Float32
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

    const buffer = ctx.createBuffer(1, float32.length, 24000)
    buffer.getChannelData(0).set(float32)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)

    const now = ctx.currentTime
    const startAt = Math.max(now, nextTime.current)
    source.start(startAt)
    nextTime.current = startAt + buffer.duration

    setIsPlaying(true)
    source.onended = () => {
      if (ctx.currentTime >= nextTime.current - 0.05) setIsPlaying(false)
    }
  }, [getCtx])

  const stopPlayback = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close()
    }
    ctxRef.current = null
    nextTime.current = 0
    setIsPlaying(false)
  }, [])

  return { enqueueAudio, stopPlayback, isPlaying }
}
