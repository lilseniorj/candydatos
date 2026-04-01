import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { updateCandidateProfile } from '../../services/candidates'
import { getResumesByCandidate } from '../../services/resumes'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import ProgressBar from '../../components/ui/ProgressBar'
import Spinner from '../../components/ui/Spinner'

const ID_TYPES = [
  { value: '', label: '—' },
  { value: 'CC', label: 'CC' }, { value: 'CE', label: 'CE' }, { value: 'Passport', label: 'Passport' },
]

export default function CandidateProfile() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth()
  const fileRef = useRef()

  const [resumeCount, setResumeCount] = useState(0)
  const [showEdit, setShowEdit]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState('')

  useEffect(() => {
    if (userDoc?.avatar_url) setAvatarUrl(userDoc.avatar_url)
    if (firebaseUser?.uid) {
      getResumesByCandidate(firebaseUser.uid).then(r => setResumeCount(r.length))
    }
  }, [userDoc, firebaseUser?.uid])

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const storageRef = ref(storage, `avatars/${firebaseUser.uid}/avatar.${ext}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateCandidateProfile(firebaseUser.uid, { ...userDoc, avatar_url: url }, resumeCount)
      setAvatarUrl(url)
      await refreshUserDoc()
    } catch (err) {
      console.error('Avatar upload error:', err)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  const pct = userDoc?.profile_completion_pct ?? 0
  const name = [userDoc?.first_name, userDoc?.last_name].filter(Boolean).join(' ') || userDoc?.email || ''

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Completion banner ────────────────────────────────────────────── */}
      {pct < 100 && (
        <Card className="p-4 border-l-4 border-orange-400">
          <ProgressBar value={pct} label={t('candidate.profile.completion')} />
          <p className="text-xs text-orange-500 mt-2">{t('candidate.profile.completeToApply')}</p>
        </Card>
      )}

      {/* ── Profile header ───────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-linear-to-r from-brand-500 to-brand-700" />

        <div className="px-6 pb-5 -mt-12">
          {/* Avatar */}
          <div className="relative inline-block mb-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-500 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center text-white text-2xl font-bold">
                {userDoc?.first_name?.[0]?.toUpperCase() || '?'}{userDoc?.last_name?.[0]?.toUpperCase() || ''}
              </div>
            )}
            {/* Upload overlay */}
            <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
                {uploading ? '...' : '📷'}
              </span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                onChange={handleAvatarUpload} disabled={uploading} />
            </label>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Name & info */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
            {userDoc?.city && <span>📍 {userDoc.city}{userDoc.country ? `, ${userDoc.country}` : ''}</span>}
            {userDoc?.phone && <span>📱 {userDoc.phone}</span>}
            {userDoc?.email && <span>✉ {userDoc.email}</span>}
          </div>

          {pct === 100 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              ✅ {t('candidate.profile.complete')}
            </div>
          )}

          {/* Edit button */}
          <div className="mt-4">
            <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
              {t('candidate.profile.editProfile')}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Info cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('candidate.profile.phone')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userDoc?.phone || '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('candidate.profile.city')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userDoc?.city || '—'}{userDoc?.country ? `, ${userDoc.country}` : ''}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('candidate.profile.idType')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userDoc?.identification_type || '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{t('candidate.profile.idNumber')}</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{userDoc?.identification_number || '—'}</p>
        </Card>
      </div>

      {/* ── Resumes link ─────────────────────────────────────────────────── */}
      <Link to="/candidate/resumes">
        <Card className="p-5 hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-xl">📑</div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{t('candidate.resume.title')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {resumeCount > 0 ? `${resumeCount} ${t('candidate.resume.documents')}` : t('candidate.resume.empty')}
                </p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </Card>
      </Link>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <EditProfileModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        userDoc={userDoc}
        firebaseUser={firebaseUser}
        resumeCount={resumeCount}
        refreshUserDoc={refreshUserDoc}
        t={t}
      />
    </div>
  )
}

// ─── Edit modal component ───────────────────────────────────────────────────
function EditProfileModal({ open, onClose, userDoc, firebaseUser, resumeCount, refreshUserDoc, t }) {
  const [saveMsg, setSaveMsg]     = useState('')
  const [saveError, setSaveError] = useState('')

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: userDoc || {},
  })

  useEffect(() => {
    if (open) reset(userDoc || {})
  }, [open, userDoc])

  async function onSubmit(data) {
    setSaveError('')
    try {
      await updateCandidateProfile(firebaseUser.uid, data, resumeCount)
      await refreshUserDoc()
      setSaveMsg('✓')
      setTimeout(() => { setSaveMsg(''); onClose() }, 800)
    } catch (err) {
      setSaveError(t('common.error'))
      console.error('Profile save error:', err)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('candidate.profile.editProfile')} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label={t('candidate.profile.firstName')} {...register('first_name')} />
          <Input label={t('candidate.profile.lastName')}  {...register('last_name')} />
          <Input label={t('candidate.profile.phone')}     type="tel" {...register('phone')} />
          <Input label={t('candidate.profile.city')}      {...register('city')} />
          <Input label={t('candidate.profile.country')}   {...register('country')} />
          <Select label={t('candidate.profile.idType')} options={[
            { value: '', label: '—' },
            { value: 'CC', label: 'CC' }, { value: 'CE', label: 'CE' }, { value: 'Passport', label: 'Passport' },
          ]} {...register('identification_type')} />
          <div className="col-span-2">
            <Input label={t('candidate.profile.idNumber')} {...register('identification_number')} />
          </div>
        </div>
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">
          {saveMsg || t('candidate.profile.save')}
        </Button>
      </form>
    </Modal>
  )
}
