import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { registerCompanyUser } from '../../services/auth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function CompanyRegister() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const password = watch('password')

  async function onSubmit({ email, password, fullName }) {
    setApiError('')
    try {
      await registerCompanyUser(email, password, fullName)
      navigate('/company/setup')
    } catch (err) {
      setApiError(err.message || t('common.error'))
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-900/40 mb-4">🏢</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.signUp')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('landing.portals.company.title')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label={t('auth.fullName')} type="text"
          error={errors.fullName?.message}
          {...register('fullName', { required: t('auth.errors.nameRequired') })} />
        <Input label={t('auth.email')} type="email"
          error={errors.email?.message}
          {...register('email', { required: t('auth.errors.emailRequired'), pattern: { value: /\S+@\S+\.\S+/, message: t('auth.errors.emailInvalid') } })} />
        <Input label={t('auth.password')} type="password"
          error={errors.password?.message}
          {...register('password', { required: t('auth.errors.passwordRequired'), minLength: { value: 6, message: t('auth.errors.passwordMin') } })} />
        <Input label={t('auth.confirmPassword')} type="password"
          error={errors.confirm?.message}
          {...register('confirm', { required: t('auth.errors.passwordRequired'), validate: v => v === password || t('auth.errors.passwordMatch') })} />
        {apiError && <p className="text-sm text-red-500 text-center">{apiError}</p>}
        <Button type="submit" className="w-full" loading={isSubmitting}>{t('auth.signUp')}</Button>
      </form>

      <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
        {t('auth.haveAccount')}{' '}
        <Link to="/company/login" className="text-brand-500 hover:underline font-medium">{t('auth.signIn')}</Link>
      </p>
      <p className="text-sm text-center mt-2">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&larr; {t('common.back')}</Link>
      </p>
    </div>
  )
}
