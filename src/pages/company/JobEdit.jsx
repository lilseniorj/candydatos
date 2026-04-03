import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getJob, updateJob, createJob } from '../../services/jobs'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

const EDUCATION_LEVELS = [
  { value: '', label: '—' },
  { value: 'none', label: 'No requerido' },
  { value: 'high_school', label: 'Bachiller' },
  { value: 'technical', label: 'Técnico / Tecnólogo' },
  { value: 'professional', label: 'Profesional' },
  { value: 'postgraduate', label: 'Posgrado / Maestría' },
]

function arrayToString(val) {
  return Array.isArray(val) ? val.join(', ') : val || ''
}

function parseCommaSeparated(val) {
  if (Array.isArray(val)) return val
  return val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
}

export default function JobEdit() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { company } = useCompany()
  const isNew = !jobId
  const [loading, setLoading] = useState(!isNew)
  const [saveMsg, setSaveMsg] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (isNew) return
    async function load() {
      const job = await getJob(jobId)
      if (!job) return navigate('/company/jobs')
      reset({
        ...job,
        benefits: arrayToString(job.benefits),
        allowed_cities: arrayToString(job.allowed_cities),
        required_certifications: arrayToString(job.required_certifications),
        required_languages: arrayToString(job.required_languages),
        required_skills: arrayToString(job.required_skills),
        accept_remote_other_cities: job.accept_remote_other_cities ? 'true' : 'false',
        application_deadline: job.application_deadline?.toDate?.()?.toISOString?.().split('T')[0] || '',
      })
      setLoading(false)
    }
    load()
  }, [jobId])

  const modalityOpts = [
    { value: 'Remote',  label: t('company.jobForm.remote') },
    { value: 'On-site', label: t('company.jobForm.onsite') },
    { value: 'Hybrid',  label: t('company.jobForm.hybrid') },
  ]
  const statusOpts = [
    { value: 'Active', label: 'Active' }, { value: 'Paused', label: 'Paused' }, { value: 'Closed', label: 'Closed' },
  ]
  const remoteOpts = [
    { value: 'false', label: t('common.no') },
    { value: 'true',  label: t('common.yes') },
  ]

  async function onSubmit(data) {
    const payload = {
      title:                     data.title,
      description:               data.description,
      work_modality:             data.work_modality,
      country:                   data.country,
      min_salary:                parseInt(data.min_salary)   || 0,
      max_salary:                parseInt(data.max_salary)   || 0,
      years_experience_required: parseInt(data.years_experience_required) || 0,
      max_applicants:            parseInt(data.max_applicants) || 100,
      benefits:                  parseCommaSeparated(data.benefits),
      application_deadline:      data.application_deadline || null,
      allowed_cities:            parseCommaSeparated(data.allowed_cities),
      accept_remote_other_cities: data.accept_remote_other_cities === 'true',
      min_education:             data.min_education || '',
      required_certifications:   parseCommaSeparated(data.required_certifications),
      required_languages:        parseCommaSeparated(data.required_languages),
      required_skills:           parseCommaSeparated(data.required_skills),
    }
    if (isNew) {
      await createJob(company.id, payload)
      navigate('/company/jobs')
    } else {
      payload.status = data.status
      await updateJob(jobId, payload)
      setSaveMsg('✓')
      setTimeout(() => setSaveMsg(''), 2000)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/company/jobs" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t('company.jobs.title')}
      </Link>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{isNew ? t('company.jobs.new') : t('company.jobs.editJob')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="p-5 space-y-4">
          <Input label={t('company.jobForm.titleField')} error={errors.title?.message}
            {...register('title', { required: true })} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('company.jobForm.description')}</label>
            <textarea rows={4} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('description')} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Select label={t('company.jobForm.modality')} options={modalityOpts} {...register('work_modality')} />
            {!isNew && <Select label={t('company.jobs.status')} options={statusOpts} {...register('status')} />}
            <Input label={t('company.jobForm.country')} {...register('country')} />
            <Input label={t('company.jobForm.minSalary')} type="number" {...register('min_salary')} />
            <Input label={t('company.jobForm.maxSalary')} type="number" {...register('max_salary')} />
            <Input label={t('company.jobForm.experience')} type="number" {...register('years_experience_required')} />
            <Input label={t('company.jobForm.maxApplicants')} type="number" {...register('max_applicants')} />
            <Input label={t('company.jobForm.deadline')} type="date" {...register('application_deadline')} />
          </div>
        </Card>

        {/* Requirements */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('company.jobForm.requirements')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input label={t('company.jobForm.allowedCities')} placeholder="Medellín, Bogotá..." {...register('allowed_cities')} />
            <Select label={t('company.jobForm.acceptRemote')} options={remoteOpts} {...register('accept_remote_other_cities')} />
            <Select label={t('company.jobForm.minEducation')} options={EDUCATION_LEVELS} {...register('min_education')} />
            <Input label={t('company.jobForm.requiredCerts')} placeholder="AWS, PMP..." {...register('required_certifications')} />
            <Input label={t('company.jobForm.requiredLangs')} placeholder="Español, Inglés B2..." {...register('required_languages')} />
            <Input label={t('company.jobForm.requiredSkills')} placeholder="React, Node.js..." {...register('required_skills')} />
          </div>
        </Card>

        <Card className="p-5">
          <Input label={t('company.jobForm.benefits')} placeholder="Salud, Vacaciones..." {...register('benefits')} />
        </Card>

        <Button type="submit" loading={isSubmitting} className="w-full">
          {saveMsg || t('company.jobForm.save')}
        </Button>
      </form>
    </div>
  )
}
