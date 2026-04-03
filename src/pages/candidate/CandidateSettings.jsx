import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { deleteUser } from 'firebase/auth'
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getResumesByCandidate, deleteResume } from '../../services/resumes'
import { getApplicationsByCandidate, deleteApplication } from '../../services/applications'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function CandidateSettings() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [exporting, setExporting]   = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting]     = useState(false)

  async function handleExportData() {
    setExporting(true)
    try {
      // Gather all user data
      const resumes = await getResumesByCandidate(firebaseUser.uid)
      const applications = await getApplicationsByCandidate(firebaseUser.uid)

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: {
          email: userDoc?.email || firebaseUser.email,
          first_name: userDoc?.first_name || '',
          last_name: userDoc?.last_name || '',
          phone: userDoc?.phone || '',
          city: userDoc?.city || '',
          country: userDoc?.country || '',
          identification_type: userDoc?.identification_type || '',
          identification_number: userDoc?.identification_number || '',
          avatar_url: userDoc?.avatar_url || '',
          profile_completion_pct: userDoc?.profile_completion_pct || 0,
        },
        resumes: resumes.map(r => ({
          name: r.name,
          created_at: r.created_at?.toDate?.()?.toISOString() || null,
          extracted_data: r.extracted_data || {},
          suggestions: r.suggestions || [],
        })),
        applications: applications.map(a => ({
          job_offer_id: a.job_offer_id,
          status: a.status,
          current_step: a.current_step,
          fit_check: a.fit_check || null,
          feedback_to_candidate: a.feedback_to_candidate || null,
          applied_at: a.applied_at?.toDate?.()?.toISOString() || null,
        })),
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `candydatos-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(t('candidate.settings.exportSuccess'))
    } catch (err) {
      console.error('Export error:', err)
      toast.error(t('common.error'))
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'ELIMINAR') return
    setDeleting(true)
    try {
      const uid = firebaseUser.uid

      // 1. Delete resumes (files + docs)
      const resumes = await getResumesByCandidate(uid)
      await Promise.all(resumes.map(r => deleteResume(r.id, r.storage_path)))

      // 2. Delete applications
      const apps = await getApplicationsByCandidate(uid)
      await Promise.all(apps.map(a => deleteApplication(a.id)))

      // 3. Delete test results linked to applications
      for (const app of apps) {
        const trQuery = query(collection(db, 'test_results'), where('application_id', '==', app.id))
        const trSnap = await getDocs(trQuery)
        await Promise.all(trSnap.docs.map(d => deleteDoc(doc(db, 'test_results', d.id))))
      }

      // 4. Delete candidate document
      await deleteDoc(doc(db, 'candidates', uid))

      // 5. Delete Firebase Auth user
      await deleteUser(firebaseUser)

      toast.success(t('candidate.settings.deleteSuccess'))
      navigate('/')
    } catch (err) {
      console.error('Delete account error:', err)
      if (err.code === 'auth/requires-recent-login') {
        toast.error(t('candidate.settings.reloginRequired'))
      } else {
        toast.error(t('common.error'))
      }
      setDeleting(false)
    }
  }

  const name = [userDoc?.first_name, userDoc?.last_name].filter(Boolean).join(' ') || firebaseUser?.email

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('candidate.settings.title')}</h1>

      {/* ── Account info ─────────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('candidate.settings.accountInfo')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('candidate.settings.email')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{firebaseUser?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('candidate.settings.name')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('candidate.settings.authMethod')}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {firebaseUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Export data ───────────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('candidate.settings.exportTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('candidate.settings.exportDesc')}</p>
        <Button variant="secondary" onClick={handleExportData} loading={exporting}>
          {t('candidate.settings.exportButton')}
        </Button>
      </Card>

      {/* ── Delete account ────────────────────────────────────────────────── */}
      <Card className="p-6 border border-red-200 dark:border-red-900/50">
        <h2 className="font-semibold text-red-600 dark:text-red-400 mb-2">{t('candidate.settings.deleteTitle')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('candidate.settings.deleteDesc')}</p>
        <Button variant="danger" onClick={() => setDeleteModal(true)}>
          {t('candidate.settings.deleteButton')}
        </Button>
      </Card>

      {/* Delete confirmation modal */}
      <Modal open={deleteModal} onClose={() => { setDeleteModal(false); setDeleteConfirm('') }}
        title={t('candidate.settings.deleteConfirmTitle')}>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{t('candidate.settings.deleteWarning')}</p>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>{t('candidate.settings.deleteItem1')}</li>
            <li>{t('candidate.settings.deleteItem2')}</li>
            <li>{t('candidate.settings.deleteItem3')}</li>
          </ul>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('candidate.settings.deleteTypeConfirm')}
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="ELIMINAR"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => { setDeleteModal(false); setDeleteConfirm('') }}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteAccount}
              loading={deleting} disabled={deleteConfirm !== 'ELIMINAR'}>
              {t('candidate.settings.deleteConfirmButton')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
