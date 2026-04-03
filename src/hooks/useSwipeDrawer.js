import { useEffect, useRef, useCallback } from 'react'

const EDGE_ZONE = 30        // px from left edge to start swipe
const MIN_DISTANCE = 60     // px minimum swipe distance to trigger
const MAX_Y_DRIFT = 80      // px max vertical drift (prevent scroll hijack)

/**
 * Hook that detects swipe gestures to open/close a mobile drawer.
 * - Swipe right from left edge → open
 * - Swipe left anywhere when open → close
 *
 * @param {boolean} isOpen - Current drawer state
 * @param {function} setOpen - State setter
 */
export default function useSwipeDrawer(isOpen, setOpen) {
  const touchStart = useRef(null)

  const handleTouchStart = useCallback((e) => {
    // Only on mobile (md breakpoint = 768px)
    if (window.innerWidth >= 768) return
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart.current) return
    if (window.innerWidth >= 768) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = Math.abs(touch.clientY - touchStart.current.y)
    const elapsed = Date.now() - touchStart.current.time

    // Ignore if too much vertical movement (user is scrolling)
    if (dy > MAX_Y_DRIFT) { touchStart.current = null; return }

    // Ignore slow drags (>500ms is probably not a swipe)
    if (elapsed > 500) { touchStart.current = null; return }

    if (!isOpen && touchStart.current.x < EDGE_ZONE && dx > MIN_DISTANCE) {
      // Swipe right from left edge → open
      setOpen(true)
    } else if (isOpen && dx < -MIN_DISTANCE) {
      // Swipe left → close
      setOpen(false)
    }

    touchStart.current = null
  }, [isOpen, setOpen])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])
}
