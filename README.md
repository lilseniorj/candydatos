# candydatos

Plataforma web de reclutamiento impulsada por inteligencia artificial que conecta empresas con candidatos mediante evaluaciones automatizadas, entrevistas en vivo con un agente AI y gestión completa del pipeline de selección.

**URL de producción:** https://candydatos.web.app

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | React 19 + Vite |
| Estilos | TailwindCSS v4 (`@tailwindcss/vite`) |
| Enrutamiento | react-router-dom v7 |
| Formularios | react-hook-form |
| Autenticación | Firebase Auth — Google OAuth 2.0 |
| Base de datos | Cloud Firestore (NoSQL) |
| Almacenamiento | Firebase Storage |
| Cloud Functions | Node.js 22 + Nodemailer (envío de emails) |
| IA generativa | Gemini 2.5 Flash — texto, audio nativo y video en tiempo real |
| Entrevistas en vivo | Gemini Live API (audio bidireccional + video 1 FPS) |
| Reportes | jsPDF (generación de reportes PDF del candidato) |
| Internacionalización | react-i18next + i18next-browser-languagedetector |
| Gráficas | recharts |
| Hosting | Firebase Hosting (CDN global) |
| Fuente | Inter (Google Fonts) |

---

## Configuración inicial

1. Copia `.env.example` a `.env` y completa las variables:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

2. Instala dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Para desplegar:
```bash
npx vite build && npx firebase deploy
```

---

## Estructura del proyecto

```
src/
├── i18n/               # Internacionalización (en/es)
├── firebase/           # Configuración de Firebase
├── context/            # AuthContext, ThemeContext, CompanyContext, ToastContext
├── services/           # Lógica de negocio (Firestore + Gemini + reportes)
│   ├── gemini.js       # Fit check, generación/evaluación de tests
│   ├── geminiLive.js   # Entrevista en vivo con Gemini Live API
│   ├── interviewEvaluator.js  # Evaluación post-entrevista
│   ├── reportPdf.js    # Generación de reportes PDF del candidato
│   ├── testCatalog.js  # Catálogo de 4 tests psicotécnicos
│   ├── notifications.js # Emails de pipeline, rechazo e invitaciones
│   └── ...             # applications, jobs, companies, resumes, etc.
├── router/             # Rutas y guards de acceso
├── layouts/            # AuthLayout, CompanyLayout, CandidateLayout
├── pages/
│   ├── public/         # Landing page, job preview público
│   ├── auth/           # Login y registro (ambos portales)
│   ├── company/        # Dashboard, ofertas, candidatos, analytics, settings
│   └── candidate/      # Perfil, hojas de vida, job board, aplicaciones
├── components/
│   ├── ui/             # Button, Input, Card, Badge, Modal, Select, etc.
│   ├── interview/      # LiveInterview (entrevista AI en vivo)
│   ├── test/           # PsychometricTest (componente de tests)
│   ├── skeletons/      # Loading skeletons
│   └── layout/         # ThemeToggle, LanguageToggle
├── hooks/              # useAudioCapture, useAudioPlayback
└── utils/              # profileCompletion, etc.

scripts/
├── seed-companies.mjs  # Poblar DB con 10 empresas y 37 ofertas
├── upload-logos.mjs    # Subir logos a Firebase Storage
├── update-tests.mjs    # Asignar tests a ofertas
├── seed-users.mjs      # Crear usuarios de empresa (utilidad)
├── cleanup-users.mjs   # Eliminar usuarios de prueba
├── seed-jobs.mjs       # Seed original de ofertas de Google
└── logos/              # Imágenes de logos de empresas

functions/
└── index.js            # Cloud Function: onMailCreated (envío de emails)
```

---

## Portales

La aplicación tiene dos portales de acceso separados con autenticación mediante Google OAuth:

| Portal | Usuarios | Collection | Entry point |
|--------|----------|------------|-------------|
| **Portal Empresa** | Reclutadores / Admins | `company_users` | `/company/login` |
| **Portal Candidato** | Aspirantes | `candidates` | `/candidate/login` |

Ambos portales usan Firebase Auth con Google Sign-In. Un mismo usuario puede tener cuentas en ambos portales sin cerrar sesión.

### Rutas principales

| Portal | URL | Descripción |
|--------|-----|-------------|
| Landing | `/` | Página pública con explicación de la plataforma |
| Job Preview | `/jobs/:jobId` | Preview público de una oferta (con Open Graph meta) |
| Empresa — Login | `/company/login` | Google Sign-In para empresas |
| Empresa — Setup | `/company/setup` | Crear empresa o aceptar invitación |
| Empresa — Dashboard | `/company/dashboard` | Resumen general con métricas |
| Empresa — Ofertas | `/company/jobs` | CRUD de ofertas laborales |
| Empresa — Nueva oferta | `/company/jobs/new` | Crear oferta con requisitos |
| Empresa — Candidatos | `/company/jobs/:id/applicants` | Lista de aplicantes por oferta |
| Empresa — Detalle | `/company/jobs/:jobId/applicants/:appId` | Detalle completo del candidato + PDF |
| Empresa — Analytics | `/company/analytics` | Dashboard de métricas y gráficas |
| Empresa — Tests | `/company/tests` | Catálogo de tests psicotécnicos |
| Empresa — Settings | `/company/settings` | Configuración, logo, equipo |
| Candidato — Login | `/candidate/login` | Google Sign-In para candidatos |
| Candidato — Perfil | `/candidate/profile` | Perfil + hojas de vida |
| Candidato — Job Board | `/candidate/jobs` | Explorar ofertas con filtros |
| Candidato — Aplicar | `/candidate/apply/:jobId` | Flujo de aplicación (4 pasos) |
| Candidato — Mis apps | `/candidate/applications` | Historial y seguimiento |
| Candidato — Settings | `/candidate/settings` | Configuración de cuenta |

---

## Flujo de aplicación del candidato

El proceso de aplicación tiene 4 pasos secuenciales, reanudable en cualquier momento:

### Paso 1 — Selección de CV
El candidato elige una de sus hojas de vida previamente cargadas y procesadas por Gemini AI.

### Paso 2 — Fit Check (Validación AI)
Gemini compara el CV contra los requisitos de la oferta y genera:
- **Score general** (0-100)
- **Scores por dimensión**: experiencia, habilidades, educación
- **Skills coincidentes y faltantes**
- **Fortalezas y áreas de mejora**
- **Feedback narrativo**

Si el candidato aprueba (score >= umbral), avanza al siguiente paso. Si no, recibe retroalimentación detallada.

### Paso 3 — Entrevista AI en vivo
Entrevista de 2 minutos con "Ana", un agente AI entrevistador que:
- Genera preguntas dinámicas basadas en el puesto, CV y fit score
- Mantiene conversación bidireccional por audio en tiempo real (Gemini Live API)
- Analiza video del candidato a 1 FPS (expresiones faciales, lenguaje corporal)
- Cubre 6 categorías psicotécnicas:
  - Conductuales/situacionales (equivale a SJT)
  - Inteligencia emocional
  - Autoconciencia (equivale a Big Five)
  - Técnicas del rol
  - Motivación
  - Resolución de problemas (equivale a Razonamiento Cognitivo)
- Graba video de la entrevista (WebM → Firebase Storage)
- Al finalizar, evalúa el transcript en 5 dimensiones: comunicación, IE, experiencia, resolución de problemas, profesionalismo

### Paso 4 — Aplicación enviada
La aplicación cambia a estado `Pending` y el candidato puede dar seguimiento desde "Mis aplicaciones".

---

## Pipeline de selección (Portal Empresa)

La empresa gestiona candidatos mediante un pipeline visual con 7 estados:

```
📥 Recibido → 👁 En revisión → 🎤 Entrevista → 💻 Prueba técnica → 📝 Oferta → ✅ Contratado
                                                                                    ❌ Rechazado
```

Cada cambio de estado:
- Envía un **email automático** al candidato (vía Cloud Functions + Nodemailer)
- Crea una **notificación in-app** visible en el portal del candidato
- Registra **timestamp** en el historial de la aplicación

### Detalle del candidato
La empresa puede ver por cada aplicante:
- Información personal y de contacto (con link directo a WhatsApp)
- Skills extraídas del CV
- Experiencia y educación
- Fit Check con scores desglosados
- Resultados de entrevista AI con gráfico de dimensiones
- Video grabado de la entrevista
- Historial del pipeline con timestamps
- Notas internas del equipo
- **Reporte PDF descargable** con toda la evaluación

### Reporte PDF
Documento profesional generado con jsPDF que incluye:
- Encabezado con branding de candydatos + empresa
- Datos del candidato y oferta
- Fit Check: score general + sub-scores + skills
- Entrevista AI: score + barras por dimensión + feedback
- Recomendación AI: Recomendado / Con reservas / No recomendado

---

## Tests psicotécnicos

El catálogo incluye 4 tipos de tests basados en literatura académica:

| Test | Tipo | Dimensiones | Respaldo |
|------|------|-------------|----------|
| **Big Five (OCEAN)** | Personalidad | Apertura, Responsabilidad, Extraversión, Amabilidad, Neuroticismo | Barrick & Mount (1991), Costa & McCrae (1992) |
| **Inteligencia Emocional** | IE | Autoconciencia, Autorregulación, Motivación, Empatía, Habilidades Sociales | Goleman (1995) |
| **Razonamiento Cognitivo** | Aptitud | Verbal, Numérico, Lógico, Patrones, Pensamiento Crítico | Schmidt & Hunter (1998) |
| **Juicio Situacional (SJT)** | Comportamiento | Decisión, Conflictos, Priorización, Equipo, Ética, Liderazgo, Cliente, Adaptabilidad | McDaniel et al. (2007) |

Las preguntas son generadas dinámicamente por Gemini adaptadas a cada oferta. El agente de entrevista cubre las 4 categorías de forma conversacional dentro de la entrevista de 2 minutos.

---

## Sistema de notificaciones por email

Firebase Cloud Functions + Nodemailer envían correos automáticos HTML para:

| Evento | Template |
|--------|----------|
| Invitación a equipo | Email con link para unirse a la empresa |
| Cambio de estado en pipeline | Email personalizado por etapa (En revisión, Entrevista, Prueba técnica, Oferta, Contratado) |
| Rechazo de aplicación | Email con feedback y razón del rechazo |

Todos los emails se crean como documentos en la colección `mail` y son procesados por la Cloud Function `onMailCreated`.

---

## Empresas y ofertas

La plataforma cuenta con 11 empresas de 10 sectores diferentes y 57+ ofertas laborales:

| Empresa | Sector | Ofertas |
|---------|--------|---------|
| Google | Tecnología | 20 |
| MediVida | Salud | 4 |
| EduFuturo | Educación | 4 |
| ConstruPro Colombia | Construcción | 4 |
| FinanPlus | Finanzas | 4 |
| Creativos LAT | Marketing y Publicidad | 4 |
| LogiExpress | Logística y Transporte | 4 |
| Sabor & Arte Restaurantes | Gastronomía | 3 |
| Rodríguez & Asociados | Legal | 3 |
| AgroVerde del Campo | Agroindustria | 3 |
| SolEnergía Renovable | Energía Renovable | 4 |

---

## Colecciones de Firestore

### `companies`
| Field | Type | Description |
|-------|------|-------------|
| `commercial_name` | `string` | Nombre comercial |
| `business_bio` | `string` | Descripción de la empresa |
| `industry_sector` | `string` | Sector industrial |
| `tax_id_type` | `string` | Tipo de identificación tributaria |
| `tax_id_number` | `string` | Número tributario |
| `logo_url` | `string` | URL del logo en Storage |
| `website_url` | `string` | Sitio web |
| `created_at` | `timestamp` | Fecha de creación |

### `company_users`
| Field | Type | Description |
|-------|------|-------------|
| `company_id` | `string` | Referencia a `companies` |
| `full_name` | `string` | Nombre del usuario |
| `email` | `string` | Correo electrónico |
| `role` | `string` | `"admin"` o `"recruiter"` |
| `created_at` | `timestamp` | Fecha de creación |

### `company_invitations`
| Field | Type | Description |
|-------|------|-------------|
| `company_id` | `string` | Referencia a `companies` |
| `invited_by` | `string` | UID del admin que invitó |
| `email` | `string` | Correo del invitado |
| `role` | `string` | Rol asignado |
| `status` | `string` | `"Pending"`, `"Accepted"` |
| `expires_at` | `timestamp` | Fecha de vencimiento (7 días) |
| `created_at` | `timestamp` | Fecha de envío |

### `candidates`
| Field | Type | Description |
|-------|------|-------------|
| `first_name` | `string` | Nombre |
| `last_name` | `string` | Apellido |
| `email` | `string` | Correo electrónico |
| `phone` | `string` | Teléfono |
| `identification_type` | `string` | Tipo de documento |
| `identification_number` | `string` | Número de documento |
| `city` | `string` | Ciudad |
| `country` | `string` | País |
| `avatar_url` | `string` | URL de foto de perfil |
| `profile_completion_pct` | `number` | Porcentaje de completitud (0-100) |
| `created_at` | `timestamp` | Fecha de creación |

### `candidate_resumes`
| Field | Type | Description |
|-------|------|-------------|
| `candidate_id` | `string` | Referencia a `candidates` |
| `name` | `string` | Nombre del CV |
| `document_url` | `string` | URL del archivo en Storage |
| `extracted_data` | `map` | Datos extraídos por Gemini: `full_name`, `email`, `phone`, `skills[]`, `experience[]`, `education[]`, `summary` |
| `suggestions` | `array` | Recomendaciones de mejora del CV |
| `created_at` | `timestamp` | Fecha de carga |

### `job_offers`
| Field | Type | Description |
|-------|------|-------------|
| `company_id` | `string` | Referencia a `companies` |
| `title` | `string` | Título del cargo |
| `description` | `string` | Descripción del puesto |
| `work_modality` | `string` | `"Remote"`, `"On-site"`, `"Hybrid"` |
| `status` | `string` | `"Active"`, `"Paused"`, `"Closed"` |
| `country` | `string` | País |
| `min_salary` | `number` | Salario mínimo |
| `max_salary` | `number` | Salario máximo |
| `years_experience_required` | `number` | Años de experiencia |
| `max_applicants` | `number` | Máximo de aplicantes |
| `benefits` | `array` | Lista de beneficios |
| `required_test_id` | `string` | Test asignado (opcional) |
| `required_skills` | `array` | Skills requeridas |
| `required_languages` | `array` | Idiomas requeridos |
| `min_education` | `string` | Nivel educativo mínimo |
| `application_deadline` | `timestamp` | Fecha límite |
| `created_at` | `timestamp` | Fecha de publicación |

### `applications`
| Field | Type | Description |
|-------|------|-------------|
| `candidate_id` | `string` | Referencia a `candidates` |
| `job_offer_id` | `string` | Referencia a `job_offers` |
| `resume_id` | `string` | CV seleccionado |
| `status` | `string` | `"Draft"`, `"Pending"`, `"Reviewed"`, `"Testing"`, `"Rejected"`, `"Hired"` |
| `pipeline_stage` | `string` | `"received"`, `"reviewing"`, `"interview"`, `"technical"`, `"offer"`, `"hired"`, `"rejected"` |
| `stage_history` | `map` | Timestamps por cada etapa |
| `current_step` | `string` | Paso actual del flujo de aplicación |
| `fit_check` | `map` | Resultado: `passed`, `score`, `feedback`, `experience_score`, `skills_score`, `education_score`, `skills_matched[]`, `skills_missing[]`, `strengths[]`, `improvements[]` |
| `reviewer_id` | `string` | Reclutador asignado |
| `feedback_to_candidate` | `string` | Feedback visible al candidato |
| `internal_notes` | `array` | Notas internas del equipo |
| `applied_at` | `timestamp` | Fecha de envío |
| `updated_at` | `timestamp` | Última actualización |

### `test_results`
| Field | Type | Description |
|-------|------|-------------|
| `application_id` | `string` | Referencia a `applications` |
| `test_id` | `string` | ID del test completado |
| `score` | `number` | Score general (0-100) |
| `trait_scores` | `map` | Scores por dimensión |
| `gemini_evaluation` | `map` | `passed`, `score`, `feedback` |
| `video_url` | `string` | URL del video de entrevista |
| `transcript` | `array` | Transcripción de la entrevista |
| `completed_at` | `timestamp` | Fecha de completación |

### `mail`
| Field | Type | Description |
|-------|------|-------------|
| `to` | `string` | Email destinatario |
| `message` | `map` | `subject`, `html` |
| `type` | `string` | `"pipeline_update"`, `"rejection"`, `"invitation"` |
| `status` | `string` | `"pending"`, `"sent"`, `"error"` |
| `metadata` | `map` | Datos contextuales del email |
| `created_at` | `timestamp` | Fecha de creación |

### `notifications`
| Field | Type | Description |
|-------|------|-------------|
| `candidate_id` | `string` | Referencia a `candidates` |
| `type` | `string` | `"status_change"`, `"hired"`, `"rejected"` |
| `title` | `string` | Título de la notificación |
| `body` | `string` | Contenido |
| `read` | `boolean` | Si fue leída |
| `created_at` | `timestamp` | Fecha de creación |

---

## Características principales

- **Entrevista AI en vivo** — Agente "Ana" con audio/video bidireccional via Gemini Live API
- **Fit Check AI** — Scoring automático CV vs oferta con desglose por dimensión
- **Pipeline visual** — 7 estados con notificaciones automáticas por email
- **Reporte PDF** — Descargable con evaluación completa del candidato
- **4 tests psicotécnicos** — Big Five, IE, Cognitivo, SJT (cubiertos en la entrevista)
- **11 empresas, 10 sectores** — Salud, Educación, Construcción, Finanzas, Marketing, Logística, Gastronomía, Legal, Agroindustria, Energía
- **Google OAuth** — Login unificado sin contraseñas
- **Dark / Light mode** — Detecta preferencia del sistema
- **Bilingüe (ES/EN)** — Detecta idioma del navegador
- **100% responsive** — Funciona en desktop y móvil
- **Compartición de ofertas** — Links públicos con Open Graph meta
- **Notas internas** — Colaboración del equipo de reclutamiento
- **WhatsApp directo** — Link a WhatsApp del candidato desde el detalle

---

## Autores

- **Jesús David Vargas Guerra** — Desarrollador full-stack (React, JavaScript, Firebase)
- **Gustavo Andrés Avila Muñoz** — Desarrollador / documentación y validación

**Universidad del Sinú — Elías Bechara Zainúm**
Programa de Ingeniería de Sistemas
Montería, Córdoba — 2026
