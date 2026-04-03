import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../context/NotificationContext'

const TYPE_ICONS = {
  status_change: '📋',
  feedback: '💬',
  hired: '🎉',
  rejected: '📭',
}

const TYPE_COLORS = {
  status_change: 'bg-blue-100 dark:bg-blue-900/30',
  feedback: 'bg-purple-100 dark:bg-purple-900/30',
  hired: 'bg-green-100 dark:bg-green-900/30',
  rejected: 'bg-red-100 dark:bg-red-900/30',
}

export default function NotificationPanel() {
  const { t } = useTranslation()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  function formatTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null
    if (!d) return ''
    const diff = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diff < 1) return t('notifications.justNow')
    if (diff < 60) return t('notifications.minutesAgo', { count: diff })
    if (diff < 1440) return t('notifications.hoursAgo', { count: Math.floor(diff / 60) })
    return t('notifications.daysAgo', { count: Math.floor(diff / 1440) })
  }

  function handleClickNotification(n) {
    if (!n.read) markAsRead(n.id)
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('notifications.title')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="fixed inset-x-0 top-14 mx-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:mx-0 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  to={n.app_id ? `/candidate/applications` : '/candidate/applications'}
                  onClick={() => handleClickNotification(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !n.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${TYPE_COLORS[n.type] || 'bg-gray-100 dark:bg-gray-700'}`}>
                    {TYPE_ICONS[n.type] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.body}</p>
                    {n.job_title && (
                      <p className="text-[10px] text-brand-500 dark:text-brand-400 mt-1 truncate">{n.job_title}</p>
                    )}
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatTime(n.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
