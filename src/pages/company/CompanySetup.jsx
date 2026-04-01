import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { createCompany, getCompany, getPendingInvitations, acceptInvitation } from '../../services/companies'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'

export default function CompanySetup() {
  const { t } = useTranslation()
  const { firebaseUser, userDoc, refreshUserDoc } = useAuth()
  const navigate = useNavigate()
  const [invitations, setInvitations]   = useState([])   // { ...inv, companyName }
  const [loading, setLoading]           = useState(true)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    async function load() {
      if (userDoc?.email) {
        const inv = await getPendingInvitations(userDoc.email)
        // Fetch company name for each invitation so the user knows who's inviting them
        const withNames = await Promise.all(
          inv.map(async i => {
            const company = await getCompany(i.company_id)
            return { ...i, companyName: company?.commercial_name ?? i.company_id }
          })
        )
        setInvitations(withNames)
      }
      setLoading(false)
    }
    load()
  }, [userDoc?.email])

  async function handleAccept(inv) {
    await acceptInvitation(inv.id, firebaseUser.uid, inv.company_id, inv.role)
    await refreshUserDoc()
    navigate('/company/dashboard')
  }

  async function onSubmit(data) {
    const companyData = {
      commercial_name: data.name,
      industry_sector: data.sector,
      business_bio:    data.bio,
      tax_id_type:     data.taxIdType,
      tax_id_number:   data.taxIdNumber,
      website_url:     data.website || '',
      logo_url:        '',
    }
    await createCompany(firebaseUser.uid, companyData)
    await refreshUserDoc()
    navigate('/company/dashboard')
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" /></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-start justify-center p-6 pt-12">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('setup.title')}</h1>

        {/* Pending invitations */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              {t('setup.invitations')}
            </h2>
            <div className="space-y-3">
              {invitations.map(inv => (
                <Card key={inv.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{inv.companyName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('setup.roleLabel')}: {inv.role}</p>
                  </div>
                  <Button size="sm" onClick={() => handleAccept(inv)}>{t('setup.acceptInvite')}</Button>
                </Card>
              ))}
            </div>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400">{t('setup.or')}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        )}

        {/* Create company form */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('setup.createNew')}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label={t('setup.companyName')} error={errors.name?.message}
              {...register('name', { required: true })} />
            <Input label={t('setup.sector')} error={errors.sector?.message}
              {...register('sector', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('setup.bio')}</label>
              <textarea rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('bio')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('setup.taxIdType')} placeholder="NIT" {...register('taxIdType')} />
              <Input label={t('setup.taxIdNumber')} {...register('taxIdNumber')} />
            </div>
            <Input label={t('setup.website')} type="url" placeholder="https://" {...register('website')} />
            <Button type="submit" className="w-full" loading={isSubmitting}>{t('setup.submit')}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
