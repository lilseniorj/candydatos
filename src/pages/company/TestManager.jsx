import { useTranslation } from 'react-i18next'
import { TEST_CATALOG } from '../../services/testCatalog'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'

export default function TestManager() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('company.tests.title')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('company.tests.catalogDesc')}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {TEST_CATALOG.map(test => (
          <Card key={test.id} className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{test.icon}</div>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{t(test.nameKey)}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(test.descKey)}</p>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    ⏱ {test.duration_minutes} min
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {test.question_count} {t('company.tests.questions')}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('company.tests.dimensions')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {test.dimensions.map(d => (
                      <span key={d} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        {t(`tests.dimensions.${d}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
