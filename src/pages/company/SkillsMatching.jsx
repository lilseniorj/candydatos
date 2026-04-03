import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompany } from '../../context/CompanyContext'
import { getJobsByCompany } from '../../services/jobs'
import { getApplicationsByJob } from '../../services/applications'
import { getResumesByCandidate } from '../../services/resumes'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function SkillsMatching() {
  const { t } = useTranslation()
  const { company } = useCompany()
  const [loading, setLoading]         = useState(true)
  const [demandData, setDemandData]   = useState([])  // { skill, demanded, have, pct }
  const [surplusData, setSurplusData] = useState([])   // { skill, count } — skills candidates have but company doesn't ask for
  const [totalCandidates, setTotalCandidates] = useState(0)

  useEffect(() => {
    if (!company?.id) return
    async function load() {
      // 1. Get all jobs and their required skills
      const jobs = await getJobsByCompany(company.id)
      const demandedSkills = {}
      jobs.forEach(job => {
        const skills = job.required_skills || []
        skills.forEach(s => {
          const key = s.trim().toLowerCase()
          if (!key) return
          if (!demandedSkills[key]) demandedSkills[key] = { label: s.trim(), jobs: new Set() }
          demandedSkills[key].jobs.add(job.id)
        })
      })

      // 2. Get all applications → unique candidate IDs
      const appsPerJob = await Promise.all(jobs.map(j => getApplicationsByJob(j.id)))
      const candidateIds = new Set()
      appsPerJob.flat().filter(a => a.status !== 'Draft').forEach(a => candidateIds.add(a.candidate_id))

      // 3. Get resumes for each candidate → extract skills
      const candidateSkills = {} // candidateId → Set of skills
      const allSkillCounts = {}  // skill → count of candidates who have it

      const resumesPerCandidate = await Promise.all(
        [...candidateIds].map(id => getResumesByCandidate(id).catch(() => []))
      )

      const candidateIdArr = [...candidateIds]
      resumesPerCandidate.forEach((resumes, i) => {
        const cid = candidateIdArr[i]
        const skillSet = new Set()
        resumes.forEach(r => {
          const skills = r.extracted_data?.skills || []
          skills.forEach(s => {
            const key = s.trim().toLowerCase()
            if (key) skillSet.add(key)
          })
        })
        candidateSkills[cid] = skillSet
        skillSet.forEach(key => {
          allSkillCounts[key] = (allSkillCounts[key] || 0) + 1
        })
      })

      const totalCands = candidateIds.size
      setTotalCandidates(totalCands)

      // 4. Build demand coverage data
      const demand = Object.entries(demandedSkills)
        .map(([key, { label, jobs: jobSet }]) => ({
          skill: label,
          demanded: jobSet.size,
          have: allSkillCounts[key] || 0,
          pct: totalCands > 0 ? Math.round(((allSkillCounts[key] || 0) / totalCands) * 100) : 0,
        }))
        .sort((a, b) => b.demanded - a.demanded || b.pct - a.pct)

      setDemandData(demand)

      // 5. Build surplus data (skills candidates have but company doesn't demand)
      const demandedKeys = new Set(Object.keys(demandedSkills))
      const surplus = Object.entries(allSkillCounts)
        .filter(([key]) => !demandedKeys.has(key))
        .map(([key, count]) => ({ skill: key.charAt(0).toUpperCase() + key.slice(1), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      setSurplusData(surplus)
      setLoading(false)
    }
    load()
  }, [company?.id])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-80 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    )
  }

  const gaps = demandData.filter(d => d.pct < 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('company.skills.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('company.skills.subtitle', { count: totalCandidates })}
        </p>
      </div>

      {demandData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('company.skills.noSkills')}</p>
        </Card>
      ) : (
        <>
          {/* ── Coverage Chart ──────────────────────────────────────────────── */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('company.skills.coverage')}</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, demandData.length * 40)}>
              <BarChart data={demandData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} width={110} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, t('company.skills.coveragePct')]}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {demandData.map((entry, i) => (
                    <Cell key={i} fill={entry.pct >= 70 ? '#22c55e' : entry.pct >= 30 ? '#f97316' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Detailed Table ──────────────────────────────────────────────── */}
          <Card className="p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('company.skills.detail')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('company.skills.skill')}</th>
                    <th className="text-center py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('company.skills.jobsDemanding')}</th>
                    <th className="text-center py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('company.skills.candidatesHave')}</th>
                    <th className="text-center py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('company.skills.coveragePct')}</th>
                    <th className="text-center py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">{t('company.skills.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {demandData.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white">{d.skill}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-400">{d.demanded}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600 dark:text-gray-400">{d.have} / {totalCandidates}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${d.pct >= 70 ? 'bg-green-500' : d.pct >= 30 ? 'bg-orange-500' : 'bg-red-500'}`}
                              style={{ width: `${d.pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8">{d.pct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {d.pct >= 70 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">OK</span>
                        ) : d.pct >= 30 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">{t('company.skills.low')}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">{t('company.skills.gap')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Gap Alerts ──────────────────────────────────────────────────── */}
          {gaps.length > 0 && (
            <Card className="p-5 border-l-4 border-red-400">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">{t('company.skills.gapAlert')}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('company.skills.gapDesc')}</p>
              <div className="flex flex-wrap gap-2">
                {gaps.map((g, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    {g.skill} ({g.pct}%)
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Surplus Skills (talent you have but don't demand) ───────────── */}
      {surplusData.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">{t('company.skills.surplus')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('company.skills.surplusDesc')}</p>
          <div className="flex flex-wrap gap-2">
            {surplusData.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {s.skill}
                <span className="text-[10px] font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full">{s.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
