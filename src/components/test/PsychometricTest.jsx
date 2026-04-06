import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generateTestQuestions, evaluateTestAnswers } from '../../services/gemini'
import { saveTestResult } from '../../services/testResults'
import { getTestById } from '../../services/testCatalog'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

export default function PsychometricTest({ testId, job, applicationId, onComplete }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  const [test, setTest]           = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers]     = useState({})
  const [current, setCurrent]     = useState(0)
  const [loading, setLoading]     = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError]         = useState('')
  const [timeLeft, setTimeLeft]   = useState(0)

  // Load test and generate questions
  useEffect(() => {
    async function init() {
      const testDef = getTestById(testId)
      if (!testDef) { setError('Test not found'); setLoading(false); return }
      setTest(testDef)
      setTimeLeft(testDef.duration_minutes * 60)
      try {
        const result = await generateTestQuestions(testDef.type, job?.title || '', lang)
        setQuestions(result.questions || [])
      } catch (err) {
        console.error('Failed to generate questions:', err)
        setError(t('common.error'))
      }
      setLoading(false)
    }
    init()
  }, [testId, job?.title, lang])

  // Timer
  useEffect(() => {
    if (loading || evaluating || timeLeft <= 0 || questions.length === 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, evaluating, questions.length])

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] != null)
  const progress = questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  async function handleSubmit() {
    if (evaluating) return
    setEvaluating(true)
    try {
      const result = await evaluateTestAnswers(test.type, t(test.nameKey), questions, answers)
      await saveTestResult(applicationId, testId, result)
      onComplete(result)
    } catch (err) {
      console.error('Test evaluation error:', err)
      setError(t('common.error'))
      setEvaluating(false)
    }
  }

  if (loading) return (
    <Card className="p-6">
      <div className="text-center py-12">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{t('tests.generating')}</p>
      </div>
    </Card>
  )

  if (error) return (
    <Card className="p-6 text-center">
      <p className="text-red-500">{error}</p>
    </Card>
  )

  if (evaluating) return (
    <Card className="p-6">
      <div className="text-center py-12">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">{t('tests.evaluating')}</p>
      </div>
    </Card>
  )

  const q = questions[current]
  if (!q) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{test?.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t(test?.nameKey)}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tests.questionOf', { current: current + 1, total: questions.length })}</p>
            </div>
          </div>
          <div className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${
            timeLeft < 60 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {/* Question */}
      <Card className="p-6">
        {/* ── Big Five: Likert scale ──────────────────────────── */}
        {test?.type === 'big_five' && (
          <>
            <p className="text-sm text-gray-900 dark:text-white font-medium mb-6 leading-relaxed">{q.text}</p>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(val => (
                <button key={val} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                    answers[q.id] === val
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 text-gray-700 dark:text-gray-300'
                  }`}>
                  <span className="font-semibold mr-2">{val}.</span>
                  {val === 1 ? t('tests.likert.stronglyDisagree')
                    : val === 2 ? t('tests.likert.disagree')
                    : val === 3 ? t('tests.likert.neutral')
                    : val === 4 ? t('tests.likert.agree')
                    : t('tests.likert.stronglyAgree')}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Emotional Intelligence: Scenarios ──────────────── */}
        {test?.type === 'emotional_intelligence' && (
          <>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{q.situation}</p>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">{q.question}</p>
            <div className="space-y-2">
              {q.options?.map(opt => (
                <button key={opt.key} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                    answers[q.id] === opt.key
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}>
                  <span className="font-bold text-brand-500 mr-2">{opt.key}.</span>
                  <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Cognitive Reasoning: MCQ with correct answer ────── */}
        {test?.type === 'cognitive_reasoning' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                {t(`tests.dimensions.${q.dimension}`)}
              </span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white font-medium mb-5 leading-relaxed">{q.text}</p>
            <div className="space-y-2">
              {q.options?.map(opt => (
                <button key={opt.key} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                    answers[q.id] === opt.key
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}>
                  <span className="font-bold text-brand-500 mr-2">{opt.key}.</span>
                  <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Situational Judgment: Scenarios ─────────────────── */}
        {test?.type === 'situational_judgment' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                {t(`tests.dimensions.${q.dimension}`)}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{q.situation}</p>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">{q.question}</p>
            <div className="space-y-2">
              {q.options?.map(opt => (
                <button key={opt.key} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                  className={`w-full p-3 rounded-xl border-2 text-left text-sm transition-all ${
                    answers[q.id] === opt.key
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}>
                  <span className="font-bold text-brand-500 mr-2">{opt.key}.</span>
                  <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setCurrent(prev => prev - 1)} disabled={current === 0}>
          {t('common.back')}
        </Button>

        <div className="flex gap-1">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-brand-500' : answers[questions[i]?.id] != null ? 'bg-brand-300 dark:bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
          ))}
        </div>

        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent(prev => prev + 1)} disabled={answers[q.id] == null}>
            {t('common.next')}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!allAnswered}>
            {t('tests.submit')}
          </Button>
        )}
      </div>
    </div>
  )
}
