import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { useAuth } from '../../context/AuthContext'
import { getJobsByCompany, deleteJob } from '../../services/jobs'
import { sendInvitation } from '../../services/companies'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import JobForm from './JobForm'

export default function JobList() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const { userDoc } = useAuth()
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editJob, setEditJob]       = useState(null)
  const [showInvite, setShowInvite]   = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('recruiter')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState('')
  const [inviteError, setInviteError] = useState('')

  async function load() {
    if (!company?.id) return
    const j = await getJobsByCompany(company.id)
    setJobs(j)
    setLoading(false)
  }

  useEffect(() => { load() }, [company?.id])

  async function handleDelete(id) {
    if (!window.confirm(t('common.confirm') + '?')) return
    await deleteJob(id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setInviteMsg('')
    try {
      await sendInvitation(company.id, userDoc.id, inviteEmail.trim(), inviteRole)
      setInviteMsg(t('company.invite.sent'))
      setInviteEmail('')
      setTimeout(() => { setInviteMsg(''); setShowInvite(false) }, 1500)
    } catch (err) {
      setInviteError(t('common.error'))
      console.error('Invite error:', err)
    } finally {
      setInviting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('company.jobs.title')}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowInvite(true)}>{t('company.invite.title')}</Button>
          <Button size="sm" onClick={() => { setEditJob(null); setShowForm(true) }}>+ {t('company.jobs.new')}</Button>
        </div>
      </div>

      {jobs.length === 0
        ? <EmptyState icon={<span className="text-5xl">📋</span>} title={t('company.jobs.empty')}
            action={<Button onClick={() => setShowForm(true)}>+ {t('company.jobs.new')}</Button>} />
        : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Card key={job.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-white">{job.title}</p>
                      <Badge status={job.status} />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {job.country} · {job.work_modality} · ${job.min_salary?.toLocaleString()}–${job.max_salary?.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/company/jobs/${job.id}/applicants`}>
                      <Button variant="secondary" size="sm">{t('company.jobs.applicants')}</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => { setEditJob(job); setShowForm(true) }}>{t('common.edit')}</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleDelete(job.id)}>{t('common.delete')}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }

      {/* Job form modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editJob ? t('common.edit') : t('company.jobs.new')} maxWidth="max-w-2xl">
        <JobForm job={editJob} companyId={company?.id} onSuccess={() => { setShowForm(false); load() }} />
      </Modal>

      {/* Invite modal */}
      <Modal open={showInvite} onClose={() => { setShowInvite(false); setInviteMsg(''); setInviteError('') }}
        title={t('company.invite.title')}>
        <div className="space-y-4">
          <Input label={t('company.invite.emailLabel')} type="email" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)} />
          <Select label={t('company.invite.roleLabel')} value={inviteRole} onChange={e => setInviteRole(e.target.value)}
            options={[{ value: 'recruiter', label: t('company.invite.recruiter') }, { value: 'admin', label: t('company.invite.admin') }]} />
          {inviteMsg   && <p className="text-sm text-green-500 text-center">{inviteMsg}</p>}
          {inviteError && <p className="text-sm text-red-500 text-center">{inviteError}</p>}
          <Button className="w-full" onClick={handleInvite} loading={inviting}>{t('company.invite.send')}</Button>
        </div>
      </Modal>
    </div>
  )
}
