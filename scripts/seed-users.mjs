/**
 * Seed script — creates Firebase Auth users + company_users docs for each seeded company
 * Run: node scripts/seed-users.mjs
 *
 * Uses Firebase Auth REST API (signUp) to create users, then writes company_users docs.
 * Requires temporary open Firestore rules for company_users.
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAUnM5lQDPfCcBbWU6SXroy7qWhJK4XnXE',
  authDomain: 'candydatos.firebaseapp.com',
  projectId: 'candydatos',
  storageBucket: 'candydatos.firebasestorage.app',
  messagingSenderId: '1019184699842',
  appId: '1:1019184699842:web:f6953c03d92c5408be5e5b',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

const companyUsers = [
  {
    email: 'admin@medivida.co',
    password: 'Medivida2026',
    fullName: 'Carlos Medina',
    companyId: 'f3g7NpQid7Yi9qo3WnfA',
    companyName: 'MediVida',
  },
  {
    email: 'admin@edufuturo.co',
    password: 'EduFuturo2026',
    fullName: 'Laura Gómez',
    companyId: 'Covr7joze078MkRxUOWx',
    companyName: 'EduFuturo',
  },
  {
    email: 'admin@construpro.co',
    password: 'ConstruPro2026',
    fullName: 'Andrés Ramírez',
    companyId: 'lcWmKSd5VvskC43mRtCD',
    companyName: 'ConstruPro Colombia',
  },
  {
    email: 'admin@finanplus.co',
    password: 'FinanPlus2026',
    fullName: 'María Torres',
    companyId: 'y7tVCLvUBnxq0ulSK0PL',
    companyName: 'FinanPlus',
  },
  {
    email: 'admin@creativoslat.co',
    password: 'CreativosLAT2026',
    fullName: 'Sofía Herrera',
    companyId: 'RrnNrYJvDQPYi6RXZP7O',
    companyName: 'Creativos LAT',
  },
  {
    email: 'admin@logiexpress.co',
    password: 'LogiExpress2026',
    fullName: 'Diego Martínez',
    companyId: '8CHHFUWo38eknQDw6hao',
    companyName: 'LogiExpress',
  },
  {
    email: 'admin@saboryarte.co',
    password: 'SaborYArte2026',
    fullName: 'Valentina Ríos',
    companyId: 'GiNNHkSdAcqOW3AWSC7n',
    companyName: 'Sabor & Arte Restaurantes',
  },
  {
    email: 'admin@rodriguezasociados.co',
    password: 'Rodriguez2026',
    fullName: 'Fernando Rodríguez',
    companyId: 'uaK3XK1WXfmxWkGDtWtc',
    companyName: 'Rodríguez & Asociados Abogados',
  },
  {
    email: 'admin@agroverde.co',
    password: 'AgroVerde2026',
    fullName: 'Camilo Suárez',
    companyId: 'qWbeRxNGapzBF30eCKMK',
    companyName: 'AgroVerde del Campo',
  },
  {
    email: 'admin@solenergia.co',
    password: 'SolEnergia2026',
    fullName: 'Paula Vargas',
    companyId: 'KyDa7detoK1YlKtNBYk9',
    companyName: 'SolEnergía Renovable',
  },
]

async function seed() {
  console.log('Creando usuarios para cada empresa...\n')

  for (const cu of companyUsers) {
    try {
      // 1. Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, cu.email, cu.password)
      const uid = cred.user.uid

      // 2. Create company_users doc
      await setDoc(doc(db, 'company_users', uid), {
        email: cu.email,
        full_name: cu.fullName,
        company_id: cu.companyId,
        role: 'admin',
        created_at: serverTimestamp(),
      })

      // 3. Sign out so we can create the next user
      await signOut(auth)

      console.log(`  ✓ ${cu.companyName}`)
      console.log(`    Email: ${cu.email}`)
      console.log(`    Pass:  ${cu.password}`)
      console.log(`    UID:   ${uid}\n`)
    } catch (err) {
      console.error(`  ✗ ${cu.companyName}: ${err.message}\n`)
    }
  }

  console.log('════════════════════════════════════════')
  console.log('Credenciales de acceso:')
  console.log('════════════════════════════════════════')
  for (const cu of companyUsers) {
    console.log(`${cu.companyName.padEnd(35)} ${cu.email.padEnd(35)} ${cu.password}`)
  }
  console.log('\nDone!')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
