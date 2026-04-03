import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createJob, updateJob } from '../../services/jobs'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const EDUCATION_LEVELS = [
  { value: '', label: '—' },
  { value: 'none', label: 'No requerido' },
  { value: 'high_school', label: 'Bachiller' },
  { value: 'technical', label: 'Técnico / Tecnólogo' },
  { value: 'professional', label: 'Profesional' },
  { value: 'postgraduate', label: 'Posgrado / Maestría' },
]

function parseCommaSeparated(val) {
  if (Array.isArray(val)) return val
  return val ? val.split(',').map(s => s.trim()).filter(Boolean) : []
}

export default function JobForm({ job, companyId, onSuccess }) {
  const { t } = useTranslation()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: job ? {
      ...job,
      benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : job.benefits || '',
      allowed_cities: Array.isArray(job.allowed_cities) ? job.allowed_cities.join(', ') : job.allowed_cities || '',
      required_certifications: Array.isArray(job.required_certifications) ? job.required_certifications.join(', ') : job.required_certifications || '',
      required_languages: Array.isArray(job.required_languages) ? job.required_languages.join(', ') : job.required_languages || '',
      required_skills: Array.isArray(job.required_skills) ? job.required_skills.join(', ') : job.required_skills || '',
      application_deadline: job.application_deadline?.toDate?.()?.toISOString?.().split('T')[0] || '',
    } : {},
  })

  const modalityOpts = [
    { value: 'Remote',  label: t('company.jobForm.remote') },
    { value: 'On-site', label: t('company.jobForm.onsite') },
    { value: 'Hybrid',  label: t('company.jobForm.hybrid') },
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
      // New requirement fields
      allowed_cities:            parseCommaSeparated(data.allowed_cities),
      accept_remote_other_cities: data.accept_remote_other_cities === 'true' || data.accept_remote_other_cities === true,
      min_education:             data.min_education || '',
      required_certifications:   parseCommaSeparated(data.required_certifications),
      required_languages:        parseCommaSeparated(data.required_languages),
      required_skills:           parseCommaSeparated(data.required_skills),
    }
    if (job?.id) {
      payload.status = data.status
      await updateJob(job.id, payload)
    } else {
      await createJob(companyId, payload)
    }
    onSuccess?.()
  }

  const statusOpts = [
    { value: 'Active', label: 'Active' }, { value: 'Paused', label: 'Paused' }, { value: 'Closed', label: 'Closed' },
  ]
  const remoteOpts = [
    { value: 'false', label: t('common.no') },
    { value: 'true',  label: t('common.yes') },
  ]

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

      {/* Requirements section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t('company.jobForm.requirements')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input label={t('company.jobForm.allowedCities')} placeholder="Medellín, Bogotá..." {...register('allowed_cities')} />
          <Select label={t('company.jobForm.acceptRemote')} options={remoteOpts} {...register('accept_remote_other_cities')} />
          <Select label={t('company.jobForm.minEducation')} options={EDUCATION_LEVELS} {...register('min_education')} />
          <Input label={t('company.jobForm.requiredCerts')} placeholder="AWS, PMP..." {...register('required_certifications')} />
          <Input label={t('company.jobForm.requiredLangs')} placeholder="Español, Inglés B2..." {...register('required_languages')} />
          <Input label={t('company.jobForm.requiredSkills')} placeholder="React, Node.js..." {...register('required_skills')} />
        </div>
      </div>

      <Input label={t('company.jobForm.benefits')} placeholder="Salud, Vacaciones..." {...register('benefits')} />
      <Button type="submit" loading={isSubmitting} className="w-full">{t('company.jobForm.save')}</Button>
    </form>
  )
}
