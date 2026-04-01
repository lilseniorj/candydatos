import { useRef, useState, useCallback } from 'react'

/**
 * Convert Int16Array to base64 string (runs in main thread where btoa exists).
 */
function int16ToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/**
 * Hook that captures microphone audio as PCM16 base64 chunks
 * suitable for sending to Gemini Live API.
 */
export default function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false)
  const ctxRef     = useRef(null)
  const streamRef  = useRef(null)
  const cbRef      = useRef(null)

  const startCapture = useCallback(async (onChunk) => {
    cbRef.current = onChunk
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
    })
    streamRef.current = stream

    const ctx = new AudioContext({ sampleRate: 16000 })
    ctxRef.current = ctx

    await ctx.audioWorklet.addModule('/audio-worklet-processor.js')
    const workletNode = new AudioWorkletNode(ctx, 'pcm16-processor')
    workletNode.port.onmessage = (e) => {
      if (e.data.pcm16 && cbRef.current) {
        const base64 = int16ToBase64(e.data.pcm16)
        cbRef.current(base64)
      }
    }

    const source = ctx.createMediaStreamSource(stream)
    source.connect(workletNode)
    workletNode.connect(ctx.destination)

    setIsCapturing(true)
    return stream
  }, [])

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    ctxRef.current?.close()
    streamRef.current = null
    ctxRef.current = null
    cbRef.current = null
    setIsCapturing(false)
  }, [])

  return { startCapture, stopCapture, isCapturing, stream: streamRef }
}
