import { useRef, useState, useCallback } from 'react'

/**
 * Hook that captures camera video frames as JPEG base64
 * at ~1 FPS for sending to Gemini Live API.
 */
export default function useVideoCapture() {
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const cbRef       = useRef(null)

  const startCapture = useCallback(async (onFrame) => {
    cbRef.current = onFrame
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
    streamRef.current = stream

    // Create hidden canvas for frame extraction
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      canvasRef.current.width = 640
      canvasRef.current.height = 480
    }

    // Attach stream to video element (caller must provide ref)
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play()
    }

    // Capture frames at 1 FPS
    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !cbRef.current) return
      const ctx = canvasRef.current.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, 640, 480)
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6)
      const base64 = dataUrl.split(',')[1]
      cbRef.current(base64)
    }, 1000)

    setIsCapturing(true)
    return stream
  }, [])

  const stopCapture = useCallback(() => {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    streamRef.current = null
    cbRef.current = null
    setIsCapturing(false)
  }, [])

  return { startCapture, stopCapture, isCapturing, videoRef, stream: streamRef }
}
