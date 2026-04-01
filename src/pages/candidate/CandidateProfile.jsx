import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { updateCandidateProfile } from '../../services/candidates'
import { uploadResume, getResumesByCandidate, deleteResume } from '../../services/resumes'
import { computeProfileCompletion } from '../../utils/profileCompletion'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import ProgressBar from '../../components/ui/ProgressBar'
import Spinner from '../../components/ui/Spinner'

const ID_TYPES = [
  { value: '', label: '—' },
  { value: 'CC', label: 'CC' }, { value: 'CE', label: 'CE' }, { value: 'Passport', label: 'Passport' },
]

export default function CandidateProfile() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth()
  const [resumes, setResumes]       = useState([])
  const [uploading, setUploading]   = useState(false)
  const [resumeName, setResumeName] = useState('')
  const [saveMsg, setSaveMsg]       = useState('')
  const [saveError, setSaveError]   = useState('')
  const [uploadError, setUploadError] = useState('')

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: userDoc || {},
  })

  useEffect(() => {
    reset(userDoc || {})
    if (firebaseUser?.uid) {
      getResumesByCandidate(firebaseUser.uid).then(setResumes)
    }
  }, [userDoc, firebaseUser?.uid])

  async function onSubmit(data) {
    setSaveError('')
    try {
      await updateCandidateProfile(firebaseUser.uid, data, resumes.length)
      await refreshUserDoc()
      setSaveMsg('✓')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch (err) {
      setSaveError(t('common.error'))
      console.error('Profile save error:', err)
    }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const result = await uploadResume(firebaseUser.uid, file, resumeName || file.name)
      setResumes(prev => [result, ...prev])
      setResumeName('')
      const pct = computeProfileCompletion({ ...userDoc }, resumes.length + 1)
      await updateCandidateProfile(firebaseUser.uid, { ...userDoc }, resumes.length + 1)
      await refreshUserDoc()
    } catch (err) {
      setUploadError(t('common.error'))
      console.error('Resume upload error:', err)
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  async function handleDeleteResume(r) {
    await deleteResume(r.id, r.storage_path)
    const updated = resumes.filter(x => x.id !== r.id)
    setResumes(updated)
    await updateCandidateProfile(firebaseUser.uid, userDoc, updated.length)
    await refreshUserDoc()
  }

  const pct = userDoc?.profile_completion_pct ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('candidate.profile.title')}</h1>

      {/* Completion banner */}
      <Card className={`p-4 border-l-4 ${pct === 100 ? 'border-green-500' : 'border-orange-400'}`}>
        <ProgressBar value={pct} label={t('candidate.profile.completion')} />
        {pct < 100 && <p className="text-xs text-orange-500 mt-2">{t('candidate.profile.completeToApply')}</p>}
      </Card>

      {/* Profile form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label={t('candidate.profile.firstName')} {...register('first_name')} />
            <Input label={t('candidate.profile.lastName')}  {...register('last_name')} />
            <Input label={t('candidate.profile.phone')}     type="tel" {...register('phone')} />
            <Input label={t('candidate.profile.city')}      {...register('city')} />
            <Input label={t('candidate.profile.country')}   {...register('country')} />
            <Select label={t('candidate.profile.idType')} options={ID_TYPES} {...register('identification_type')} />
            <div className="sm:col-span-2">
              <Input label={t('candidate.profile.idNumber')} {...register('identification_number')} />
            </div>
          </div>
          {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          <Button type="submit" loading={isSubmitting} className="w-full">
            {saveMsg || t('candidate.profile.save')}
          </Button>
        </form>
      </Card>

      {/* Resumes */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('candidate.resume.title')}</h2>

        {/* Upload */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input placeholder={t('candidate.resume.name')} value={resumeName} onChange={e => setResumeName(e.target.value)} className="flex-1" />
          <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-dashed border-brand-400 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer text-sm font-medium transition-colors">
            {uploading ? <Spinner size="sm" /> : <span>⬆ {t('candidate.resume.upload')}</span>}
            <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={handleResumeUpload} disabled={uploading} />
          </label>
        </div>

        {uploading    && <p className="text-sm text-brand-500 mb-3">{t('candidate.resume.uploading')}</p>}
        {uploadError  && <p className="text-sm text-red-500 mb-3">{uploadError}</p>}

        {resumes.length === 0
          ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('candidate.resume.empty')}</p>
          : (
            <div className="space-y-3">
              {resumes.map(r => (
                <div key={r.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{r.name}</p>
                      <a href={r.document_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand-500 hover:underline">📄 {t('common.view')}</a>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                      onClick={() => handleDeleteResume(r)}>{t('common.delete')}</Button>
                  </div>
                  {r.suggestions?.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs font-medium text-brand-500 cursor-pointer">🤖 {t('candidate.resume.suggestions')}</summary>
                      <ul className="mt-2 space-y-1">
                        {r.suggestions.map((s, i) => <li key={i} className="text-xs text-gray-500 dark:text-gray-400">• {s}</li>)}
                      </ul>
                    </details>
                  )}
                  {r.extracted_data?.skills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.extracted_data.skills.slice(0, 6).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{s}</span>
                      ))}
                    </div>
                  )}
                  {r.suggestions?.length === 0 && !r.extracted_data?.skills?.length && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{t('candidate.resume.noAiData')}</p>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Card>
    </div>
  )
}
