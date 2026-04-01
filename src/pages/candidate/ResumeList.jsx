import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { uploadResume, getResumesByCandidate, deleteResume } from '../../services/resumes'
import { updateCandidateProfile } from '../../services/candidates'
import { computeProfileCompletion } from '../../utils/profileCompletion'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function ResumeList() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth()
  const [resumes, setResumes]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [resumeName, setResumeName] = useState('')
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    if (firebaseUser?.uid) {
      getResumesByCandidate(firebaseUser.uid).then(r => { setResumes(r); setLoading(false) })
    }
  }, [firebaseUser?.uid])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const result = await uploadResume(firebaseUser.uid, file, resumeName || file.name)
      setResumes(prev => [result, ...prev])
      setResumeName('')
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

  async function handleDelete(r) {
    await deleteResume(r.id, r.storage_path)
    const updated = resumes.filter(x => x.id !== r.id)
    setResumes(updated)
    await updateCandidateProfile(firebaseUser.uid, userDoc, updated.length)
    await refreshUserDoc()
  }

  function getScore(r) {
    const d = r.extracted_data || {}
    const sk = Math.min(100, (d.skills?.length || 0) * 14)
    const ex = Math.min(100, (d.experience?.length || 0) * 30 + ((d.experience || []).reduce((a, e) => a + (parseInt(e.years) || 1), 0)) * 10)
    const ed = Math.min(100, (d.education?.length || 0) * 40)
    const st = Math.min(100, (d.full_name ? 15 : 0) + (d.email ? 15 : 0) + (d.phone ? 10 : 0) + (d.summary ? 20 : 0) + ((d.skills?.length || 0) > 0 ? 15 : 0) + ((d.experience?.length || 0) > 0 ? 15 : 0) + ((d.education?.length || 0) > 0 ? 10 : 0))
    return Math.round((sk + ex + ed + st) / 4)
  }

  function getDate(r) {
    if (r.created_at?.toDate) return r.created_at.toDate().toLocaleDateString()
    if (r.created_at?.seconds) return new Date(r.created_at.seconds * 1000).toLocaleDateString()
    return '—'
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('candidate.resume.title')}</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{resumes.length} {t('candidate.resume.documents')}</span>
      </div>

      {/* Upload card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input placeholder={t('candidate.resume.name')} value={resumeName}
            onChange={e => setResumeName(e.target.value)} className="flex-1" />
          <label className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 cursor-pointer text-sm font-medium transition-colors shrink-0">
            {uploading ? <Spinner size="sm" /> : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {t('candidate.resume.upload')}
              </>
            )}
            <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
        {uploading   && <p className="text-sm text-brand-500 mt-3">{t('candidate.resume.uploading')}</p>}
        {uploadError && <p className="text-sm text-red-500 mt-3">{uploadError}</p>}
      </Card>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <EmptyState
          icon={<span className="text-5xl">📄</span>}
          title={t('candidate.resume.empty')}
          description={t('candidate.resume.emptyDesc')}
        />
      ) : (
        <div className="space-y-3">
          {resumes.map(r => {
            const score = getScore(r)
            const skills = r.extracted_data?.skills || []
            const scoreColor = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-orange-500' : 'text-red-400'
            const ringColor  = score >= 70 ? 'text-green-500' : score >= 40 ? 'text-orange-500' : 'text-red-400'

            return (
              <Link key={r.id} to={`/candidate/resumes/${r.id}`} className="block group">
                <Card className="p-0 overflow-hidden hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700 transition-all">
                  <div className="flex items-center gap-4 p-4">
                    {/* Score ring */}
                    <div className="relative shrink-0">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5"
                          className="text-gray-200 dark:text-gray-700" />
                        <circle cx="28" cy="28" r="23" fill="none" stroke="currentColor" strokeWidth="5"
                          strokeLinecap="round" className={ringColor}
                          strokeDasharray={`${(score / 100) * 144.5} 144.5`}
                          transform="rotate(-90 28 28)" />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor}`}>{score}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-500 transition-colors">{r.name}</h3>
                        {r.extracted_data?.full_name && (
                          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 truncate">— {r.extracted_data.full_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{getDate(r)}</p>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {skills.slice(0, 5).map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{s}</span>
                          ))}
                          {skills.length > 5 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">+{skills.length - 5}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-300 dark:text-gray-600 group-hover:text-brand-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
