/**
 * Pre-defined psychometric tests available to every company.
 * Tests are code-level constants — no Firestore document needed.
 * Gemini generates the actual questions dynamically per candidate.
 */

export const TEST_CATALOG = [
  {
    id: 'big_five_v1',
    type: 'big_five',
    nameKey: 'tests.catalog.bigFive.name',
    descKey: 'tests.catalog.bigFive.desc',
    icon: '🧠',
    duration_minutes: 10,
    question_count: 10,
    dimensions: ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'],
  },
  {
    id: 'emotional_intelligence_v1',
    type: 'emotional_intelligence',
    nameKey: 'tests.catalog.ei.name',
    descKey: 'tests.catalog.ei.desc',
    icon: '💡',
    duration_minutes: 15,
    question_count: 5,
    dimensions: ['self_awareness', 'self_regulation', 'motivation', 'empathy', 'social_skills'],
  },
  {
    id: 'cognitive_reasoning_v1',
    type: 'cognitive_reasoning',
    nameKey: 'tests.catalog.cognitive.name',
    descKey: 'tests.catalog.cognitive.desc',
    icon: '🔢',
    duration_minutes: 20,
    question_count: 10,
    dimensions: ['verbal_reasoning', 'numerical_reasoning', 'logical_reasoning', 'pattern_recognition', 'critical_thinking'],
  },
  {
    id: 'situational_judgment_v1',
    type: 'situational_judgment',
    nameKey: 'tests.catalog.sjt.name',
    descKey: 'tests.catalog.sjt.desc',
    icon: '⚖️',
    duration_minutes: 20,
    question_count: 8,
    dimensions: ['decision_making', 'conflict_resolution', 'prioritization', 'teamwork', 'ethics', 'leadership', 'customer_orientation', 'adaptability'],
  },
]

export function getTestById(id) {
  return TEST_CATALOG.find(t => t.id === id) ?? null
}
