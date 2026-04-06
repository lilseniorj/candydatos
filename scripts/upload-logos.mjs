/**
 * Upload company logos to Firebase Storage and update Firestore
 * Run: node scripts/upload-logos.mjs
 *
 * Requires temporary open Storage rules (same as seed approach)
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const app = initializeApp({
  apiKey: 'AIzaSyAUnM5lQDPfCcBbWU6SXroy7qWhJK4XnXE',
  authDomain: 'candydatos.firebaseapp.com',
  projectId: 'candydatos',
  storageBucket: 'candydatos.firebasestorage.app',
})
const db = getFirestore(app)
const storage = getStorage(app)

// Map: filename (lowercase, no spaces/accents) → Firestore company ID
const companyMap = {
  'agroverdedelcampo':              'qWbeRxNGapzBF30eCKMK',
  'construprocolombia':             'lcWmKSd5VvskC43mRtCD',
  'creativoslat':                   'RrnNrYJvDQPYi6RXZP7O',
  'edufuturo':                      'Covr7joze078MkRxUOWx',
  'finanplus':                      'y7tVCLvUBnxq0ulSK0PL',
  'logiexpress':                    '8CHHFUWo38eknQDw6hao',
  'medivida':                       'f3g7NpQid7Yi9qo3WnfA',
  'rodriguezasociadosabogados':     'uaK3XK1WXfmxWkGDtWtc',
  'saboryarterestaurantes':         'GiNNHkSdAcqOW3AWSC7n',
  'saborarterestaurantes':          'GiNNHkSdAcqOW3AWSC7n',
  'solenergiarenovable':            'KyDa7detoK1YlKtNBYk9',
}

function normalize(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\.[^.]+$/, '')                           // remove extension
    .replace(/[^a-zA-Z0-9]/g, '')                      // remove spaces, &, etc.
    .toLowerCase()
}

const logosDir = new URL('./logos/', import.meta.url).pathname
const files = readdirSync(logosDir)

console.log(`Found ${files.length} logo files\n`)

for (const file of files) {
  const key = normalize(file)
  const companyId = companyMap[key]

  if (!companyId) {
    console.log(`  ✗ No match for "${file}" (normalized: "${key}")`)
    continue
  }

  const ext = extname(file).slice(1) // png, jpg, jpeg
  const filePath = join(logosDir, file)
  const fileBuffer = readFileSync(filePath)

  const mimeTypes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' }
  const contentType = mimeTypes[ext.toLowerCase()] || 'image/png'

  // Upload to Storage at logos/{companyId}/logo.{ext}
  const storageRef = ref(storage, `logos/${companyId}/logo.${ext}`)
  await uploadBytes(storageRef, fileBuffer, { contentType })
  const url = await getDownloadURL(storageRef)

  // Update Firestore
  await updateDoc(doc(db, 'companies', companyId), { logo_url: url })

  console.log(`  ✓ ${file} → ${companyId} (${ext})`)
}

console.log('\nDone!')
process.exit(0)
