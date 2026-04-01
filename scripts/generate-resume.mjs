/**
 * Generates a professional PDF resume for a Fullstack Junior developer
 * Run: node scripts/generate-resume.mjs
 */
import PDFDocument from 'pdfkit'
import { createWriteStream } from 'fs'

const OUTPUT = 'scripts/Carlos_Martinez_CV.pdf'

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 55, right: 55 },
})

doc.pipe(createWriteStream(OUTPUT))

// ─── Colors ─────────────────────────────────────────────────────────────────
const PRIMARY   = '#2563EB'
const DARK      = '#1E293B'
const GRAY      = '#64748B'
const LIGHT_BG  = '#F1F5F9'

// ─── Helper functions ───────────────────────────────────────────────────────
function sectionTitle(text) {
  doc.moveDown(0.6)
  doc.fontSize(13).fillColor(PRIMARY).font('Helvetica-Bold').text(text.toUpperCase(), { characterSpacing: 1.5 })
  doc.moveTo(doc.x, doc.y + 2).lineTo(doc.x + 500, doc.y + 2).strokeColor(PRIMARY).lineWidth(1.5).stroke()
  doc.moveDown(0.5)
}

function label(text) {
  doc.fontSize(10.5).fillColor(DARK).font('Helvetica-Bold').text(text, { continued: true })
}

function value(text) {
  doc.fontSize(10.5).fillColor(DARK).font('Helvetica').text('  ' + text)
}

function bullet(text) {
  doc.fontSize(10).fillColor(DARK).font('Helvetica').text('•  ' + text, { indent: 10 })
}

function period(text) {
  doc.fontSize(9).fillColor(GRAY).font('Helvetica-Oblique').text(text)
}

// ─── Header ─────────────────────────────────────────────────────────────────
doc.rect(0, 0, doc.page.width, 110).fill(PRIMARY)

doc.fontSize(26).fillColor('#FFFFFF').font('Helvetica-Bold')
   .text('Carlos Andrés Martínez López', 55, 30)

doc.fontSize(12).fillColor('#DBEAFE').font('Helvetica')
   .text('Desarrollador Fullstack Junior  |  React · Node.js · Firebase', 55, 62)

doc.fontSize(9.5).fillColor('#BFDBFE').font('Helvetica')
   .text('carlos.martinez.dev@gmail.com   |   +57 310 456 7890   |   Bogotá, Colombia   |   github.com/carlosmartinez-dev', 55, 85)

doc.y = 130

// ─── Perfil Profesional ────────────────────────────────────────────────────
sectionTitle('Perfil Profesional')
doc.fontSize(10.5).fillColor(DARK).font('Helvetica')
   .text(
     'Desarrollador fullstack junior con 1.5 años de experiencia construyendo aplicaciones web con React, Node.js y Firebase. ' +
     'Apasionado por las interfaces modernas y la arquitectura serverless. Experiencia práctica en Tailwind CSS, Firestore, ' +
     'autenticación con Firebase Auth y despliegue en Google Cloud. Sólidas bases en estructuras de datos, Git y metodologías ágiles. ' +
     'Busco un entorno de crecimiento donde pueda aportar valor desde el primer día y seguir aprendiendo.',
     { lineGap: 3 }
   )

// ─── Experiencia Laboral ───────────────────────────────────────────────────
sectionTitle('Experiencia Laboral')

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('Desarrollador Frontend  —  TechStartup Colombia SAS')
period('Enero 2025 – Presente  |  Bogotá (Remoto)')
doc.moveDown(0.3)
bullet('Desarrollo de interfaces con React 18, Tailwind CSS y componentes reutilizables')
bullet('Integración con APIs REST y Firebase Firestore para gestión de datos en tiempo real')
bullet('Implementación de autenticación social (Google, GitHub) con Firebase Auth')
bullet('Participación activa en code reviews y ceremonias Scrum (daily, retro, planning)')
bullet('Reducción del bundle size en un 35% mediante lazy loading y code splitting')

doc.moveDown(0.6)

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('Practicante de Desarrollo Web  —  Agencia Digital Creativa')
period('Julio 2024 – Diciembre 2024  |  Bogotá (Híbrido)')
doc.moveDown(0.3)
bullet('Maquetación de landing pages responsive con HTML5, CSS3 y JavaScript vanilla')
bullet('Migración de componentes legacy a React con Vite como bundler')
bullet('Creación de formularios dinámicos con React Hook Form y validación Yup')
bullet('Configuración de despliegues automáticos con GitHub Actions y Firebase Hosting')

// ─── Educación ─────────────────────────────────────────────────────────────
sectionTitle('Educación')

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('Ingeniería de Sistemas  —  Universidad Nacional de Colombia')
period('2020 – 2024  |  Bogotá')
doc.moveDown(0.2)
bullet('Promedio: 4.2/5.0')
bullet('Proyecto de grado: Plataforma de gestión de voluntariados con React + Firebase')

doc.moveDown(0.4)

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('Certificaciones')
doc.moveDown(0.2)
bullet('Meta Front-End Developer Professional Certificate — Coursera (2024)')
bullet('Google Cloud Digital Leader — Google (2024)')
bullet('Firebase para Web — Platzi (2023)')

// ─── Habilidades Técnicas ──────────────────────────────────────────────────
sectionTitle('Habilidades Técnicas')

const skills = [
  ['Frontend',      'React 18, JavaScript ES6+, TypeScript (básico), HTML5, CSS3, Tailwind CSS'],
  ['Backend',       'Node.js, Express, REST APIs, Firebase Cloud Functions'],
  ['Bases de datos', 'Firestore, PostgreSQL (básico), MongoDB (básico)'],
  ['Cloud & DevOps', 'Firebase (Auth, Hosting, Storage), Google Cloud Platform, Docker (básico), GitHub Actions'],
  ['Herramientas',   'Git, VS Code, Figma, Postman, Jira, Notion'],
  ['Metodologías',   'Scrum, Kanban, Git Flow'],
]

skills.forEach(([key, val]) => {
  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(key + ': ', { continued: true })
  doc.font('Helvetica').text(val)
  doc.moveDown(0.15)
})

// ─── Proyectos Personales ──────────────────────────────────────────────────
sectionTitle('Proyectos Personales')

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('TaskFlow  —  App de gestión de tareas')
doc.fontSize(10).fillColor(DARK).font('Helvetica')
   .text('React + Firestore + Tailwind. CRUD completo con auth, drag & drop (dnd-kit) y modo oscuro. Desplegada en Firebase Hosting.')

doc.moveDown(0.4)

doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text('DevBlog  —  Blog personal')
doc.fontSize(10).fillColor(DARK).font('Helvetica')
   .text('Next.js + MDX + Vercel. Blog estático con SSG, SEO optimizado y sistema de tags. 15+ artículos publicados sobre React y Firebase.')

// ─── Idiomas ───────────────────────────────────────────────────────────────
sectionTitle('Idiomas')
doc.fontSize(10.5).fillColor(DARK).font('Helvetica')
bullet('Español — Nativo')
bullet('Inglés — B2 (lectura técnica fluida, conversación intermedia)')

// ─── Finalize ──────────────────────────────────────────────────────────────
doc.end()

console.log(`✅ Resume generated: ${OUTPUT}`)
