import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createJob, updateJob } from '../../services/jobs'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

export default function JobForm({ job, companyId, onSuccess }) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: job
      ? { ...job, application_deadline: job.application_deadline?.toDate?.()?.toISOString?.().split('T')[0] }
      : {},
  })

  const modalityOpts = [
    { value: 'Remote',  label: t('company.jobForm.remote') },
    { value: 'On-site', label: t('company.jobForm.onsite') },
    { value: 'Hybrid',  label: t('company.jobForm.hybrid') },
  ]
  const statusOpts = [
    { value: 'Active', label: 'Active' }, { value: 'Paused', label: 'Paused' }, { value: 'Closed', label: 'Closed' },
  ]

  async function onSubmit(data) {
    const payload = {
      ...data,
      min_salary:                parseInt(data.min_salary)   || 0,
      max_salary:                parseInt(data.max_salary)   || 0,
      years_experience_required: parseInt(data.years_experience_required) || 0,
      max_applicants:            parseInt(data.max_applicants) || 100,
      benefits:                  data.benefits ? data.benefits.split(',').map(s => s.trim()).filter(Boolean) : [],
      required_test_id:          data.required_test_id || null,
    }
    if (job?.id) await updateJob(job.id, payload)
    else         await createJob(companyId, payload)
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Input label={t('company.jobForm.titleField')} error={errors.title?.message}
        {...register('title', { required: true })} />
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('company.jobForm.description')}</label>
        <textarea rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('description')} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Select label={t('company.jobForm.modality')} options={modalityOpts} {...register('work_modality')} />
        {job && <Select label={t('company.jobs.status')} options={statusOpts} {...register('status')} />}
        <Input label={t('company.jobForm.country')} {...register('country')} />
        <Input label={t('company.jobForm.minSalary')} type="number" {...register('min_salary')} />
        <Input label={t('company.jobForm.maxSalary')} type="number" {...register('max_salary')} />
        <Input label={t('company.jobForm.experience')} type="number" {...register('years_experience_required')} />
        <Input label={t('company.jobForm.maxApplicants')} type="number" {...register('max_applicants')} />
        <Input label={t('company.jobForm.deadline')} type="date" {...register('application_deadline')} />
      </div>
      <Input label={t('company.jobForm.benefits')} placeholder="Salud, Vacaciones..." {...register('benefits')} />
      <Button type="submit" loading={isSubmitting} className="w-full">{t('company.jobForm.save')}</Button>
    </form>
  )
}
