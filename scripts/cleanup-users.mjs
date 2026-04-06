/**
 * Cleanup: delete the 10 seed Auth users and their company_users docs
 * Run: node scripts/cleanup-users.mjs
 */
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, deleteUser } from 'firebase/auth'
import { getFirestore, doc, deleteDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAUnM5lQDPfCcBbWU6SXroy7qWhJK4XnXE',
  authDomain: 'candydatos.firebaseapp.com',
  projectId: 'candydatos',
})
const auth = getAuth(app)
const db = getFirestore(app)

const users = [
  { email: 'admin@medivida.co',            password: 'Medivida2026',      uid: 'q77bfFYpEhORXb80Ta5wRyGBPhc2' },
  { email: 'admin@edufuturo.co',           password: 'EduFuturo2026',     uid: 'ztQFeDPIvrZrpVF2ytagFypj4bo1' },
  { email: 'admin@construpro.co',          password: 'ConstruPro2026',    uid: 'P2jtKOU9oTW7AT5xrQUAppvq1Ez1' },
  { email: 'admin@finanplus.co',           password: 'FinanPlus2026',     uid: 'zt0mUvGJeocK5a344ijuf4sxeDq1' },
  { email: 'admin@creativoslat.co',        password: 'CreativosLAT2026',  uid: 'ENqmLx63cXd39AVUQ7z07cSvSit1' },
  { email: 'admin@logiexpress.co',         password: 'LogiExpress2026',   uid: 'OFalQdH48zav5iidMDiabtzdcLu1' },
  { email: 'admin@saboryarte.co',          password: 'SaborYArte2026',    uid: 'XLx67dbjE1T1dguA7cXoGpflfMR2' },
  { email: 'admin@rodriguezasociados.co',  password: 'Rodriguez2026',     uid: '6TdYDVp5F2fZJsf1BH6gfbzzS6s2' },
  { email: 'admin@agroverde.co',           password: 'AgroVerde2026',     uid: 'IqRZInbWqzeOZj7LFBmtHL7XeR62' },
  { email: 'admin@solenergia.co',          password: 'SolEnergia2026',    uid: 'Ig4ltynobiMYjFoG8kjFGsIgWqn1' },
]

for (const u of users) {
  try {
    const cred = await signInWithEmailAndPassword(auth, u.email, u.password)
    await deleteUser(cred.user)
    console.log(`  ✓ Auth deleted: ${u.email}`)
  } catch (err) {
    console.log(`  ✗ Auth: ${u.email} — ${err.code}`)
  }
  try {
    await deleteDoc(doc(db, 'company_users', u.uid))
    console.log(`  ✓ Doc deleted: company_users/${u.uid}`)
  } catch (err) {
    console.log(`  ✗ Doc: ${u.uid} — ${err.code}`)
  }
}

console.log('\nDone!')
process.exit(0)
