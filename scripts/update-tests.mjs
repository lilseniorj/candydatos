/**
 * Update job offers with appropriate test types based on sector/role
 * Run: node scripts/update-tests.mjs
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAUnM5lQDPfCcBbWU6SXroy7qWhJK4XnXE',
  authDomain: 'candydatos.firebaseapp.com',
  projectId: 'candydatos',
})
const db = getFirestore(app)

// Map company IDs to their names for logging
const companyNames = {
  'f3g7NpQid7Yi9qo3WnfA': 'MediVida',
  'Covr7joze078MkRxUOWx': 'EduFuturo',
  'lcWmKSd5VvskC43mRtCD': 'ConstruPro',
  'y7tVCLvUBnxq0ulSK0PL': 'FinanPlus',
  'RrnNrYJvDQPYi6RXZP7O': 'Creativos LAT',
  '8CHHFUWo38eknQDw6hao': 'LogiExpress',
  'GiNNHkSdAcqOW3AWSC7n': 'Sabor & Arte',
  'uaK3XK1WXfmxWkGDtWtc': 'Rodríguez & Asociados',
  'qWbeRxNGapzBF30eCKMK': 'AgroVerde',
  'KyDa7detoK1YlKtNBYk9': 'SolEnergía',
}

// Assign test based on job title keywords and role type
function assignTest(title, companyId) {
  const t = title.toLowerCase()

  // Cognitive reasoning — roles that need analytical/technical thinking
  if (t.includes('ingeniero') || t.includes('analista financiero') || t.includes('analista de riesgo') ||
      t.includes('contador') || t.includes('arquitecto') || t.includes('analista de inventario') ||
      t.includes('coordinador/a de comercio') || t.includes('diseñador/a instruccional')) {
    return 'cognitive_reasoning_v1'
  }

  // Situational judgment — roles with decision-making, leadership, client-facing
  if (t.includes('coordinador') || t.includes('jefe') || t.includes('director') ||
      t.includes('administrador') || t.includes('chef') || t.includes('supervisor') ||
      t.includes('inspector') || t.includes('abogado') || t.includes('especialista')) {
    return 'situational_judgment_v1'
  }

  // Emotional intelligence — roles with high human interaction
  if (t.includes('médico') || t.includes('enfermero') || t.includes('psicólogo') ||
      t.includes('asesor') || t.includes('docente') || t.includes('profesor') ||
      t.includes('community') || t.includes('bartender')) {
    return 'emotional_intelligence_v1'
  }

  // Big Five — general roles, auxiliary, drivers, technicians
  if (t.includes('auxiliar') || t.includes('conductor') || t.includes('maestro') ||
      t.includes('técnico') || t.includes('paralegal')) {
    return 'big_five_v1'
  }

  // Default: situational judgment for remaining roles
  return 'situational_judgment_v1'
}

async function update() {
  const companyIds = Object.keys(companyNames)
  let updated = 0

  for (const companyId of companyIds) {
    const q = query(collection(db, 'job_offers'), where('company_id', '==', companyId))
    const snap = await getDocs(q)

    for (const d of snap.docs) {
      const job = d.data()
      const testId = assignTest(job.title, companyId)
      await updateDoc(doc(db, 'job_offers', d.id), { required_test_id: testId })
      updated++
      console.log(`  ✓ [${companyNames[companyId]}] ${job.title} → ${testId}`)
    }
  }

  console.log(`\n${updated} ofertas actualizadas.`)
  process.exit(0)
}

update().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
