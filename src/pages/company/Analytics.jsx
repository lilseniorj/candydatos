import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getJobsByCompany } from '../../services/jobs'
import { getApplicationsByJob } from '../../services/applications'
import { getTestResultsByApplication } from '../../services/testResults'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'

const BIG5_TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
const EI_DIMS     = ['self_awareness', 'self_regulation', 'motivation', 'empathy', 'social_skills']

export default function Analytics() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const [funnelData, setFunnelData]   = useState([])
  const [bigFiveData, setBigFiveData] = useState([])
  const [eiData, setEiData]           = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!company?.id) return
    async function load() {
      const jobs = await getJobsByCompany(company.id)
      const funnel = []

      const b5Accum = Object.fromEntries(BIG5_TRAITS.map(t => [t, 0]))
      let b5Count   = 0
      const eiAccum = Object.fromEntries(EI_DIMS.map(t => [t, 0]))
      let eiCount   = 0

      for (const job of jobs) {
        const apps = await getApplicationsByJob(job.id)
        const submitted = apps.filter(a => a.status !== 'Draft')
        funnel.push({
          name:     job.title.length > 20 ? job.title.slice(0, 18) + '…' : job.title,
          Pending:  submitted.filter(a => a.status === 'Pending').length,
          Reviewed: submitted.filter(a => a.status === 'Reviewed').length,
          Testing:  submitted.filter(a => a.status === 'Testing').length,
          Hired:    submitted.filter(a => a.status === 'Hired').length,
          Rejected: submitted.filter(a => a.status === 'Rejected').length,
        })

        for (const app of submitted) {
          const results = await getTestResultsByApplication(app.id)
          results.forEach(r => {
            if (!r.trait_scores) return
            // Detect whether this is a Big Five or EI result
            if (r.trait_scores.openness != null) {
              BIG5_TRAITS.forEach(trait => { b5Accum[trait] += r.trait_scores[trait] || 0 })
              b5Count++
            } else if (r.trait_scores.self_awareness != null) {
              EI_DIMS.forEach(dim => { eiAccum[dim] += r.trait_scores[dim] || 0 })
              eiCount++
            }
          })
        }
      }

      setFunnelData(funnel)
      if (b5Count > 0) {
        setBigFiveData(BIG5_TRAITS.map(trait => ({
          trait: t(`tests.dimensions.${trait}`),
          value: Math.round(b5Accum[trait] / b5Count),
        })))
      }
      if (eiCount > 0) {
        setEiData(EI_DIMS.map(dim => ({
          trait: t(`tests.dimensions.${dim}`),
          value: Math.round(eiAccum[dim] / eiCount),
        })))
      }
      setLoading(false)
    }
    load()
  }, [company?.id])

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('company.analytics.title')}</h1>

      {/* Funnel chart */}
      <Card className="p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('company.analytics.funnel')}</h2>
        {funnelData.length === 0
          ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
          : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pending"  fill="#3D7FC3" />
                <Bar dataKey="Reviewed" fill="#8b5cf6" />
                <Bar dataKey="Testing"  fill="#f97316" />
                <Bar dataKey="Hired"    fill="#22c55e" />
                <Bar dataKey="Rejected" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </Card>

      {/* Radar charts side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Big Five radar */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">🧠 {t('company.analytics.bigFive')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('company.analytics.bigFiveDesc')}</p>
          {bigFiveData.length === 0
            ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
            : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={bigFiveData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#3D7FC3" fill="#3D7FC3" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        {/* EI radar */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">💡 {t('company.analytics.ei')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('company.analytics.eiDesc')}</p>
          {eiData.length === 0
            ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
            : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={eiData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            )
          }
        </Card>
      </div>
    </div>
  )
}
