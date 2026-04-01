import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { getJob, updateJob } from '../../services/jobs'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'

export default function JobEdit() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    async function load() {
      const job = await getJob(jobId)
      if (!job) return navigate('/company/jobs')
      reset({
        ...job,
        benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : job.benefits || '',
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
    { value: 'Active', label: 'Active' },
    { value: 'Paused', label: 'Paused' },
    { value: 'Closed', label: 'Closed' },
  ]

  async function onSubmit(data) {
    const payload = {
      title:                     data.title,
      description:               data.description,
      work_modality:             data.work_modality,
      status:                    data.status,
      country:                   data.country,
      min_salary:                parseInt(data.min_salary)   || 0,
      max_salary:                parseInt(data.max_salary)   || 0,
      years_experience_required: parseInt(data.years_experience_required) || 0,
      max_applicants:            parseInt(data.max_applicants) || 100,
      benefits:                  data.benefits ? data.benefits.split(',').map(s => s.trim()).filter(Boolean) : [],
      required_test_id:          data.required_test_id || null,
      application_deadline:      data.application_deadline || null,
    }
    await updateJob(jobId, payload)
    setSaveMsg('✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/company/jobs" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        {t('company.jobs.title')}
      </Link>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('company.jobs.editJob')}</h1>

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
            <Select label={t('company.jobs.status')} options={statusOpts} {...register('status')} />
            <Input label={t('company.jobForm.country')} {...register('country')} />
            <Input label={t('company.jobForm.minSalary')} type="number" {...register('min_salary')} />
            <Input label={t('company.jobForm.maxSalary')} type="number" {...register('max_salary')} />
            <Input label={t('company.jobForm.experience')} type="number" {...register('years_experience_required')} />
            <Input label={t('company.jobForm.maxApplicants')} type="number" {...register('max_applicants')} />
            <Input label={t('company.jobForm.deadline')} type="date" {...register('application_deadline')} />
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
