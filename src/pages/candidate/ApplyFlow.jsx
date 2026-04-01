import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { getJob } from '../../services/jobs'
import { getResumesByCandidate } from '../../services/resumes'
import {
  getOrCreateDraftApplication,
  updateApplication,
  submitApplication,
} from '../../services/applications'
import { checkFit, generateTestQuestions, evaluateTestAnswers } from '../../services/gemini'
import { saveTestResult } from '../../services/testResults'
import { getTestById } from '../../services/testCatalog'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import ProgressBar from '../../components/ui/ProgressBar'

const STEPS    = ['cv_selection', 'fit_check', 'test', 'submitted']
const STEP_IDX = { cv_selection: 0, fit_check: 1, test: 2, submitted: 3 }

// ─── Likert helpers ──────────────────────────────────────────────────────────
const LIKERT_VALUES = [1, 2, 3, 4, 5]

// ─── Component ───────────────────────────────────────────────────────────────
export default function ApplyFlow() {
  const { t, i18n } = useTranslation()
  const { jobId }    = useParams()
  const navigate     = useNavigate()
  const { firebaseUser } = useAuth()

  const [job, setJob]                           = useState(null)
  const [app, setApp]                           = useState(null)
  const [resumes, setResumes]                   = useState([])
  const [selectedResume, setSelectedResume]      = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [processing, setProcessing]             = useState(false)
  const [fitResult, setFitResult]               = useState(null)

  // Test state
  const [testMeta, setTestMeta]                 = useState(null) // catalog entry
  const [questions, setQuestions]                = useState([])
  const [answers, setAnswers]                   = useState({})
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [testError, setTestError]               = useState('')

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [fetchedJob, fetchedResumes, fetchedApp] = await Promise.all([
        getJob(jobId),
        getResumesByCandidate(firebaseUser.uid),
        getOrCreateDraftApplication(firebaseUser.uid, jobId),
      ])
      setJob(fetchedJob)
      setResumes(fetchedResumes)
      setApp(fetchedApp)
      if (fetchedApp.fit_check) setFitResult(fetchedApp.fit_check)
      if (fetchedApp.resume_id)
        setSelectedResume(fetchedResumes.find(r => r.id === fetchedApp.resume_id))

      // Restore saved test state (for resume capability)
      if (fetchedApp.test_questions?.length) {
        setQuestions(fetchedApp.test_questions)
        setAnswers(fetchedApp.test_answers ?? {})
      }
      if (fetchedJob?.required_test_id) {
        setTestMeta(getTestById(fetchedJob.required_test_id))
      }
      setLoading(false)
    }
    init()
  }, [jobId, firebaseUser?.uid])

  const currentStep = app?.current_step || 'cv_selection'
  const stepIdx     = STEP_IDX[currentStep] ?? 0

  // ── Step 1: CV Selection ───────────────────────────────────────────────────
  async function handleSelectResume(resume) {
    setSelectedResume(resume)
    await updateApplication(app.id, { resume_id: resume.id, current_step: 'fit_check' })
    setApp(prev => ({ ...prev, resume_id: resume.id, current_step: 'fit_check' }))
  }

  // ── Go back to CV selection ─────────────────────────────────────────────────
  async function handleGoBack() {
    setFitResult(null)
    setSelectedResume(null)
    await updateApplication(app.id, { resume_id: null, fit_check: null, current_step: 'cv_selection' })
    setApp(prev => ({ ...prev, resume_id: null, fit_check: null, current_step: 'cv_selection' }))
  }

  // ── Step 2: Fit Check ──────────────────────────────────────────────────────
  async function handleFitCheck() {
    setProcessing(true)
    try {
      const lang   = i18n.language?.startsWith('es') ? 'es' : 'en'
      const result = await checkFit(selectedResume.extracted_data, job, lang)
      setFitResult(result)
      const nextStep = result.passed ? 'test' : 'fit_check'
      await updateApplication(app.id, { fit_check: result, current_step: nextStep })
      setApp(prev => ({ ...prev, fit_check: result, current_step: nextStep }))
    } finally {
      setProcessing(false)
    }
  }

  // ── Step 3 pre: Generate test questions ────────────────────────────────────
  async function handleStartTest() {
    if (!testMeta) {
      await handleFinalSubmit()
      return
    }

    // If questions were already generated (resuming), go straight to test
    if (questions.length) return

    setGeneratingQuestions(true)
    setTestError('')
    try {
      const lang   = i18n.language?.startsWith('es') ? 'es' : 'en'
      const result = await generateTestQuestions(testMeta.type, job.title, lang)
      const qs     = result.questions ?? []
      setQuestions(qs)
      // Persist generated questions in the application so the candidate can resume
      await updateApplication(app.id, { test_questions: qs, test_answers: {} })
    } catch (err) {
      setTestError(t('common.error'))
      console.error('Question generation error:', err)
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // ── Step 3: Save answers in real-time ──────────────────────────────────────
  function handleAnswer(qId, value) {
    setAnswers(prev => {
      const next = { ...prev, [qId]: value }
      // Fire-and-forget: persist partial answers for resume capability
      updateApplication(app.id, { test_answers: next })
      return next
    })
  }

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] != null)

  // ── Step 3: Submit test ────────────────────────────────────────────────────
  async function handleSubmitTest() {
    setProcessing(true)
    setTestError('')
    try {
      const result = await evaluateTestAnswers(testMeta.type, t(testMeta.nameKey), questions, answers)
      await saveTestResult(app.id, testMeta.id, result)
      await submitApplication(app.id)
      setApp(prev => ({ ...prev, current_step: 'submitted', status: 'Pending' }))
    } catch (err) {
      setTestError(t('common.error'))
      console.error('Test evaluation error:', err)
    } finally {
      setProcessing(false)
    }
  }

  // ── Step 3 skip (no test required) ─────────────────────────────────────────
  async function handleFinalSubmit() {
    setProcessing(true)
    try {
      await submitApplication(app.id)
      setApp(prev => ({ ...prev, current_step: 'submitted', status: 'Pending' }))
    } finally {
      setProcessing(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{job?.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{job?.country} · {job?.work_modality}</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center flex-1 gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
              i < stepIdx ? 'bg-brand-500 text-white'
              : i === stepIdx ? 'bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-900'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            }`}>{i + 1}</div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < stepIdx ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ─── Step 1: CV Selection ─────────────────────────────────────────── */}
      {currentStep === 'cv_selection' && (
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('candidate.apply.step1')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('candidate.apply.selectResume')}</p>
          <div className="space-y-3">
            {resumes.map(r => (
              <button key={r.id} onClick={() => handleSelectResume(r)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedResume?.id === r.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                }`}>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{r.name}</p>
                {r.extracted_data?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.extracted_data.skills.slice(0, 3).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{s}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Step 2: Fit Check ────────────────────────────────────────────── */}
      {currentStep === 'fit_check' && (
        <>
          {!fitResult ? (
            <Card className="p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t('candidate.apply.step2')}</h2>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('candidate.apply.selectResume')}: <strong>{selectedResume?.name}</strong>
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="ghost" onClick={handleGoBack}>{t('candidate.apply.changeResume')}</Button>
                  <Button onClick={handleFitCheck} loading={processing}>{t('candidate.apply.continue')}</Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* ── Score Hero Card ──────────────────────────────────────── */}
              <Card className={`p-0 overflow-hidden border-2 ${
                fitResult.passed
                  ? 'border-green-300 dark:border-green-700'
                  : 'border-red-300 dark:border-red-700'
              }`}>
                <div className={`px-5 py-4 flex items-center gap-4 ${
                  fitResult.passed
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  {/* Circular score */}
                  <div className="relative shrink-0">
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="6"
                        className="text-gray-200 dark:text-gray-700" />
                      <circle cx="36" cy="36" r="30" fill="none" strokeWidth="6" strokeLinecap="round"
                        className={fitResult.passed ? 'text-green-500' : 'text-red-400'}
                        stroke="currentColor"
                        strokeDasharray={`${(fitResult.score / 100) * 188.5} 188.5`}
                        transform="rotate(-90 36 36)" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${
                      fitResult.passed ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                    }`}>{fitResult.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base ${
                      fitResult.passed ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'
                    }`}>
                      {fitResult.passed ? '✅ ' + t('candidate.apply.fitPassed') : '❌ ' + t('candidate.apply.fitFailed')}
                    </p>
                    {fitResult.feedback && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{fitResult.feedback}</p>
                    )}
                  </div>
                </div>
              </Card>

              {/* ── Score Breakdown Cards ────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('candidate.apply.fitExperience'), score: fitResult.experience_score, icon: '💼' },
                  { label: t('candidate.apply.fitSkills'),     score: fitResult.skills_score,     icon: '⚡' },
                  { label: t('candidate.apply.fitEducation'),  score: fitResult.education_score,  icon: '🎓' },
                ].map(item => (
                  <Card key={item.label} className="p-4 text-center">
                    <span className="text-2xl">{item.icon}</span>
                    <p className={`text-2xl font-bold mt-1 ${
                      (item.score ?? 0) >= 60 ? 'text-green-500' : (item.score ?? 0) >= 30 ? 'text-orange-500' : 'text-red-400'
                    }`}>{item.score ?? 0}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{item.label}</p>
                  </Card>
                ))}
              </div>

              {/* ── Skills Match Card ────────────────────────────────────── */}
              {(fitResult.skills_matched?.length > 0 || fitResult.skills_missing?.length > 0) && (
                <Card className="p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">⚡ {t('candidate.apply.fitSkillsMatch')}</h3>
                  {fitResult.skills_matched?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {fitResult.skills_matched.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {fitResult.skills_missing?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fitResult.skills_missing.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* ── Detail Cards (Experience & Education) ────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fitResult.experience_note && (
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">💼</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">{t('candidate.apply.fitExperience')}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{fitResult.experience_note}</p>
                      </div>
                    </div>
                  </Card>
                )}
                {fitResult.education_note && (
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">🎓</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-1">{t('candidate.apply.fitEducation')}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{fitResult.education_note}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* ── Strengths & Improvements ─────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fitResult.strengths?.length > 0 && (
                  <Card className="p-4 border-l-4 border-l-green-500">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">🌟 {t('candidate.apply.fitStrengths')}</p>
                    <ul className="space-y-1.5">
                      {fitResult.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="text-green-500 mt-0.5 shrink-0">●</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {fitResult.improvements?.length > 0 && (
                  <Card className="p-4 border-l-4 border-l-orange-400">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">💡 {t('candidate.apply.fitImprovements')}</p>
                    <ul className="space-y-1.5">
                      {fitResult.improvements.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="text-orange-400 mt-0.5 shrink-0">●</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              {/* ── Action Buttons ───────────────────────────────────────── */}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={handleGoBack} disabled={processing}>
                  {t('candidate.apply.changeResume')}
                </Button>
                {fitResult.passed && (
                  <Button className="flex-1" onClick={handleStartTest} loading={processing || generatingQuestions}>
                    {testMeta ? `${testMeta.icon} ${t('candidate.apply.startTest')}` : t('candidate.apply.continue')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Step 3: Test ─────────────────────────────────────────────────── */}
      {currentStep === 'test' && (
        <div className="space-y-4">
          {/* Test intro header */}
          {testMeta && (
            <Card className="p-4 flex items-center gap-4 border-l-4 border-brand-500">
              <span className="text-3xl">{testMeta.icon}</span>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{t(testMeta.nameKey)}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ⏱ ~{testMeta.duration_minutes} min · {questions.length} {t('company.tests.questions')}
                </p>
              </div>
            </Card>
          )}

          {/* Loading / generating */}
          {generatingQuestions && (
            <Card className="p-8 text-center">
              <Spinner size="lg" />
              <p className="text-sm text-brand-500 mt-4">{t('candidate.apply.generatingTest')}</p>
            </Card>
          )}

          {/* No questions yet and not generating — button to generate */}
          {!generatingQuestions && questions.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('candidate.apply.testReady')}</p>
              <Button onClick={handleStartTest} loading={generatingQuestions}>
                {testMeta?.icon} {t('candidate.apply.startTest')}
              </Button>
            </Card>
          )}

          {/* ── Big Five: Likert scale questions ──────────────────────────── */}
          {questions.length > 0 && testMeta?.type === 'big_five' && (
            <Card className="p-6 space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id}>
                  <div className="flex gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{q.text}</p>
                  </div>

                  <div className="flex items-center justify-between gap-1 px-2">
                    <span className="text-xs text-gray-400 shrink-0 w-20 text-left">{t('tests.likert.stronglyDisagree')}</span>
                    <div className="flex gap-2">
                      {LIKERT_VALUES.map(val => (
                        <button key={val} type="button" onClick={() => handleAnswer(q.id, val)}
                          className={`w-10 h-10 rounded-full border-2 text-sm font-bold transition-all ${
                            answers[q.id] === val
                              ? 'bg-brand-500 border-brand-500 text-white scale-110 shadow-md'
                              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-brand-400 hover:text-brand-500'
                          }`}>
                          {val}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 w-20 text-right">{t('tests.likert.stronglyAgree')}</span>
                  </div>

                  {idx < questions.length - 1 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 mt-5" />
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* ── Emotional Intelligence: Scenario cards ────────────────────── */}
          {questions.length > 0 && testMeta?.type === 'emotional_intelligence' && (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <Card key={q.id} className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wide">
                      {t(`tests.dimensions.${q.dimension}`)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{q.situation}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{q.question}</p>

                  <div className="space-y-2">
                    {q.options.map(opt => (
                      <button key={opt.key} type="button" onClick={() => handleAnswer(q.id, opt.key)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                          answers[q.id] === opt.key
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-300'
                        }`}>
                        <span className="font-bold mr-2">{opt.key}.</span> {opt.text}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Submit test */}
          {questions.length > 0 && (
            <div className="space-y-2">
              {/* Progress indicator */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {Object.keys(answers).length}/{questions.length} {t('candidate.apply.answered')}
                </span>
                {!allAnswered && <span className="text-orange-500">{t('candidate.apply.answerAll')}</span>}
              </div>
              <ProgressBar value={(Object.keys(answers).length / questions.length) * 100} />

              {testError && <p className="text-sm text-red-500 text-center">{testError}</p>}

              <Button className="w-full" onClick={handleSubmitTest}
                loading={processing} disabled={!allAnswered}>
                {t('candidate.apply.submitTest')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 4: Submitted ────────────────────────────────────────────── */}
      {currentStep === 'submitted' && (
        <Card className="p-6 text-center py-12">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('candidate.apply.successTitle')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('candidate.apply.successDesc')}</p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <Button onClick={() => navigate('/candidate/applications')}>{t('candidate.applications.title')}</Button>
            <Button variant="ghost" onClick={() => navigate('/candidate/jobs')}>{t('candidate.apply.backToJobs')}</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
