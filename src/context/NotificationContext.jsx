import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { subscribeToNotifications, markAsRead as markReadService, markAllAsRead as markAllReadService } from '../services/notifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { firebaseUser, userType } = useAuth()
  const [notifications, setNotifications] = useState([])

  const isCandidate = userType === 'candidate' || userType === 'both'

  useEffect(() => {
    if (!firebaseUser?.uid || !isCandidate) {
      setNotifications([])
      return
    }
    const unsubscribe = subscribeToNotifications(firebaseUser.uid, setNotifications)
    return () => unsubscribe()
  }, [firebaseUser?.uid, isCandidate])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = useCallback(async (id) => {
    await markReadService(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!firebaseUser?.uid) return
    await markAllReadService(firebaseUser.uid)
  }, [firebaseUser?.uid])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>')
  return ctx
}
