import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase/config'
import { useCompany } from '../../context/CompanyContext'
import { useToast } from '../../context/ToastContext'
import { updateCompany } from '../../services/companies'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

export default function CompanySettings() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const fileRef = useRef()

  const toast = useToast()
  const [logoPreview, setLogoPreview] = useState(company?.logo_url || '')
  const [uploading, setUploading]     = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      commercial_name: company?.commercial_name || '',
      industry_sector: company?.industry_sector || '',
      business_bio:    company?.business_bio    || '',
      tax_id_type:     company?.tax_id_type     || '',
      tax_id_number:   company?.tax_id_number   || '',
      website_url:     company?.website_url      || '',
    },
  })

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) {
      toast.warning(t('company.settings.logoTooLarge'))
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const storageRef = ref(storage, `logos/${company.id}/logo.${ext}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)

      await updateCompany(company.id, { logo_url: url })
      setLogoPreview(url)
      toast.success(t('toast.logoUploaded'))
    } catch (err) {
      console.error('Logo upload error:', err)
      toast.error(t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data) {
    try {
      await updateCompany(company.id, data)
      toast.success(t('toast.settingsSaved'))
    } catch (err) {
      console.error('Settings save error:', err)
      toast.error(t('common.error'))
    }
  }

  if (!company) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('company.settings.title')}</h1>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('company.settings.logo')}</h2>
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="relative group">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <span className="text-3xl text-gray-400">{company.commercial_name?.[0]?.toUpperCase() || '🏢'}</span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Upload controls */}
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('company.settings.logoHint')}</p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 cursor-pointer text-sm font-medium transition-colors">
              {uploading ? <Spinner size="sm" /> : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {t('company.settings.uploadLogo')}
                </>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only"
                onChange={handleLogoUpload} disabled={uploading} />
            </label>
            {logoPreview && (
              <button onClick={async () => {
                await updateCompany(company.id, { logo_url: '' })
                setLogoPreview('')
                // company auto-refreshes via onSnapshot
              }} className="ml-3 text-xs text-red-500 hover:text-red-600 font-medium">
                {t('company.settings.removeLogo')}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Company info ─────────────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('company.settings.companyInfo')}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label={t('setup.companyName')} error={errors.commercial_name?.message}
            {...register('commercial_name', { required: t('validation.required'), minLength: { value: 2, message: t('validation.minLength', { min: 2 }) } })} />
          <Input label={t('setup.sector')} {...register('industry_sector')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('setup.bio')}</label>
            <textarea rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('business_bio')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('setup.taxIdType')} {...register('tax_id_type')} />
            <Input label={t('setup.taxIdNumber')} {...register('tax_id_number')} />
          </div>
          <Input label={t('setup.website')} type="url" placeholder="https://" {...register('website_url')} />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {t('company.settings.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
