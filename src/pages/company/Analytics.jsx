import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getJobsByCompany } from '../../services/jobs'
import { getApplicationsByJob } from '../../services/applications'
import { getTestResultsByApplication } from '../../services/testResults'
import { getCandidate } from '../../services/candidates'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'

const INTERVIEW_TRAITS = ['communication', 'emotional_intelligence', 'experience_relevance', 'problem_solving', 'professionalism']

export default function Analytics() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const [funnelData, setFunnelData]       = useState([])
  const [interviewAvg, setInterviewAvg]   = useState([])
  const [interviewList, setInterviewList] = useState([])
  const [loading, setLoading]             = useState(true)

  // Interview filters
  const [ivSearch, setIvSearch]     = useState('')
  const [ivJobFilter, setIvJobFilter] = useState('')
  const [ivStatus, setIvStatus]     = useState('all') // all | passed | failed
  const [ivSort, setIvSort]         = useState('score') // score | date
  const [ivVisible, setIvVisible]   = useState(10)

  useEffect(() => {
    if (!company?.id) return
    async function load() {
      const jobs = await getJobsByCompany(company.id)
      const funnel = []
      const ivAccum = Object.fromEntries(INTERVIEW_TRAITS.map(t => [t, 0]))
      let ivCount = 0
      const allInterviews = []

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
          for (const r of results) {
            if (!r.trait_scores) continue
            // Detect interview results (have 'communication' trait)
            if (r.trait_scores.communication != null) {
              INTERVIEW_TRAITS.forEach(trait => { ivAccum[trait] += r.trait_scores[trait] || 0 })
              ivCount++
              // Fetch candidate name for the list
              let candidateName = app.candidate_id.slice(0, 10) + '…'
              try {
                const c = await getCandidate(app.candidate_id)
                if (c) candidateName = [c.first_name, c.last_name].filter(Boolean).join(' ')
              } catch {}
              allInterviews.push({
                candidateName,
                jobId: job.id,
                appId: app.id,
                jobTitle: job.title,
                score: r.score,
                passed: r.gemini_evaluation?.passed,
                traits: r.trait_scores,
                feedback: r.gemini_evaluation?.feedback,
                video_url: r.video_url,
                date: r.completed_at,
              })
            }
          }
        }
      }

      setFunnelData(funnel)
      if (ivCount > 0) {
        setInterviewAvg(INTERVIEW_TRAITS.map(trait => ({
          trait: trait.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value: Math.round(ivAccum[trait] / ivCount),
          fullMark: 100,
        })))
      }
      setInterviewList(allInterviews.sort((a, b) => (b.score || 0) - (a.score || 0)))
      setLoading(false)
    }
    load()
  }, [company?.id])

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null
    return d ? d.toLocaleDateString() : '—'
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('company.analytics.title')}</h1>

      {/* ── Funnel chart ─────────────────────────────────────────────────── */}
      <Card className="p-6">
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
                <Bar dataKey="Hired"    fill="#22c55e" />
                <Bar dataKey="Pending"  fill="#3D7FC3" />
                <Bar dataKey="Rejected" fill="#ef4444" />
                <Bar dataKey="Reviewed" fill="#8b5cf6" />
                <Bar dataKey="Testing"  fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </Card>

      {/* ── Interview Scores Radar ───────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-1">🎥 {t('company.analytics.interviewScores')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('company.analytics.interviewScoresDesc')}</p>
        {interviewAvg.length === 0
          ? <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
          : (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={interviewAvg}>
                <PolarGrid />
                <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11 }} />
                <Radar dataKey="value" stroke="#3D7FC3" fill="#3D7FC3" fillOpacity={0.4} name="Avg Score" />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          )
        }
      </Card>

      {/* ── Interview Results Table ──────────────────────────────────────── */}
      {interviewList.length > 0 && (() => {
        const jobTitles = [...new Set(interviewList.map(iv => iv.jobTitle))]
        const filtered = interviewList
          .filter(iv => {
            if (ivSearch && !iv.candidateName.toLowerCase().includes(ivSearch.toLowerCase())) return false
            if (ivJobFilter && iv.jobTitle !== ivJobFilter) return false
            if (ivStatus === 'passed' && !iv.passed) return false
            if (ivStatus === 'failed' && iv.passed) return false
            return true
          })
          .sort((a, b) => ivSort === 'score' ? (b.score || 0) - (a.score || 0) : ((b.date?.seconds || 0) - (a.date?.seconds || 0)))
        const visible = filtered.slice(0, ivVisible)
        const hasMore = filtered.length > ivVisible

        return (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">📋 {t('company.analytics.interviewResults')}</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{filtered.length} {t('company.analytics.totalResults')}</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex-1 min-w-38">
              <Input placeholder={t('company.analytics.searchCandidate')} value={ivSearch} onChange={e => { setIvSearch(e.target.value); setIvVisible(10) }} />
            </div>
            <Select value={ivJobFilter} onChange={e => { setIvJobFilter(e.target.value); setIvVisible(10) }} className="w-44"
              options={[{ value: '', label: t('company.analytics.allJobs') }, ...jobTitles.map(j => ({ value: j, label: j.length > 25 ? j.slice(0, 23) + '…' : j }))]} />
            <Select value={ivStatus} onChange={e => { setIvStatus(e.target.value); setIvVisible(10) }} className="w-32"
              options={[{ value: 'all', label: t('common.all') }, { value: 'passed', label: '✅ Passed' }, { value: 'failed', label: '❌ Failed' }]} />
            <Select value={ivSort} onChange={e => setIvSort(e.target.value)} className="w-36"
              options={[{ value: 'score', label: t('company.analytics.sortScore') }, { value: 'date', label: t('company.analytics.sortDate') }]} />
          </div>

          {filtered.length === 0
            ? <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('company.analytics.noResults')}</p>
            : (
          <div className="space-y-3">
            {visible.map((iv, i) => {
              const scoreColor = iv.score >= 70 ? 'text-green-500' : iv.score >= 40 ? 'text-orange-500' : 'text-red-400'
              return (
                <Link key={i} to={`/company/jobs/${iv.jobId}/applicants/${iv.appId}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700 transition-all">
                  {/* Score ring */}
                  <div className="relative shrink-0">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                        className={scoreColor}
                        strokeDasharray={`${((iv.score || 0) / 100) * 125.7} 125.7`}
                        transform="rotate(-90 24 24)" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>{iv.score || 0}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{iv.candidateName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{iv.jobTitle} · {formatDate(iv.date)}</p>
                    {iv.feedback && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{iv.feedback}</p>}
                  </div>

                  {/* Trait mini bars */}
                  <div className="hidden sm:flex flex-col gap-1 w-40 shrink-0">
                    {INTERVIEW_TRAITS.map(trait => {
                      const val = iv.traits?.[trait] || 0
                      return (
                        <div key={trait} className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 w-6 text-right">{val}</span>
                          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${val >= 70 ? 'bg-green-500' : val >= 40 ? 'bg-orange-500' : 'bg-red-400'}`}
                              style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      iv.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                    }`}>
                      {iv.passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
          )}

          {/* Load more */}
          {hasMore && (
            <button onClick={() => setIvVisible(prev => prev + 10)}
              className="w-full mt-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
              {t('company.analytics.loadMore')} ({filtered.length - ivVisible} {t('company.analytics.remaining')})
            </button>
          )}
        </Card>
        )
      })()}
    </div>
  )
}
