/**
 * Seed script — populates Firestore with diverse companies and job offers
 * Run: node scripts/seed-companies.mjs
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
const app = initializeApp({
  apiKey: 'AIzaSyAUnM5lQDPfCcBbWU6SXroy7qWhJK4XnXE',
  authDomain: 'candydatos.firebaseapp.com',
  projectId: 'candydatos',
})
const db = getFirestore(app)

console.log('Conectado a Firestore (sin auth — requiere reglas abiertas)\n')

const companies = [
  // ─── Salud ────────────────────────────────────────────────────────────────
  {
    commercial_name: 'MediVida',
    industry_sector: 'Salud',
    business_bio: 'Red de clínicas y hospitales líder en Colombia con más de 15 años de experiencia. Ofrecemos atención médica integral con tecnología de punta y un equipo humano comprometido con el bienestar de nuestros pacientes.',
    website_url: 'https://medivida.com.co',
    jobs: [
      {
        title: 'Médico General',
        description: 'Buscamos médico general para atención en consulta externa. Atenderás pacientes ambulatorios, realizarás diagnósticos y seguimiento de tratamientos. Se requiere tarjeta profesional vigente y vocación de servicio.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 5000000,
        max_salary: 7000000,
        years_experience_required: 2,
        max_applicants: 50,
        benefits: ['Salud prepagada', 'Alimentación', 'Parqueadero', 'Capacitación continua'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Enfermero/a Jefe',
        description: 'Coordinarás el equipo de enfermería en el área de hospitalización. Supervisarás la administración de medicamentos, el cuidado de pacientes y la documentación clínica. Se requiere especialización en enfermería clínica.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3500000,
        max_salary: 5000000,
        years_experience_required: 3,
        max_applicants: 40,
        benefits: ['Salud prepagada', 'Alimentación', 'Recargos nocturnos', 'Estabilidad laboral'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Auxiliar de Farmacia',
        description: 'Dispensación de medicamentos, control de inventario y atención al público en farmacia hospitalaria. Se requiere certificación como auxiliar de farmacia y conocimiento en normativa INVIMA.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 1800000,
        max_salary: 2500000,
        years_experience_required: 1,
        max_applicants: 60,
        benefits: ['Salud', 'Alimentación', 'Ruta de transporte'],
        required_test_id: null,
      },
      {
        title: 'Psicólogo/a Clínico',
        description: 'Atención psicológica individual y grupal en nuestra unidad de salud mental. Evaluación, diagnóstico e intervención terapéutica. Se requiere maestría en psicología clínica y registro profesional vigente.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 6000000,
        years_experience_required: 3,
        max_applicants: 30,
        benefits: ['Salud prepagada', 'Horario flexible', 'Supervisión clínica', 'Capacitación'],
        required_test_id: 'emotional_intelligence',
      },
    ],
  },

  // ─── Educación ────────────────────────────────────────────────────────────
  {
    commercial_name: 'EduFuturo',
    industry_sector: 'Educación',
    business_bio: 'Institución educativa innovadora que combina metodologías activas con tecnología para transformar la educación en Latinoamérica. Operamos colegios y programas de formación virtual con presencia en 5 países.',
    website_url: 'https://edufuturo.edu.co',
    jobs: [
      {
        title: 'Docente de Matemáticas (Secundaria)',
        description: 'Enseñarás matemáticas a estudiantes de 6to a 11vo grado usando metodologías activas y herramientas digitales. Se requiere licenciatura en matemáticas o afines y pasión por la enseñanza.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 2800000,
        max_salary: 4000000,
        years_experience_required: 2,
        max_applicants: 40,
        benefits: ['Salud', 'Alimentación', 'Descuento en matrícula hijos', 'Vacaciones docentes'],
        required_test_id: 'big_five',
      },
      {
        title: 'Diseñador/a Instruccional',
        description: 'Diseñarás cursos y contenidos educativos para nuestra plataforma virtual. Crearás guiones, actividades interactivas y evaluaciones. Se requiere experiencia en e-learning y herramientas como Articulate o Moodle.',
        work_modality: 'Remote',
        country: 'Colombia',
        min_salary: 3200000,
        max_salary: 4800000,
        years_experience_required: 2,
        max_applicants: 35,
        benefits: ['Salud', 'Trabajo remoto', 'Capacitación', 'Horario flexible'],
        required_test_id: 'big_five',
      },
      {
        title: 'Coordinador/a Académico',
        description: 'Liderarás la gestión académica de una sede, supervisando docentes, planes de estudio y procesos de evaluación. Se requiere maestría en educación y experiencia en cargos directivos educativos.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 5000000,
        max_salary: 7500000,
        years_experience_required: 5,
        max_applicants: 20,
        benefits: ['Salud prepagada', 'Alimentación', 'Parqueadero', 'Bono anual'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Profesor/a de Inglés',
        description: 'Impartirás clases de inglés a todos los niveles con enfoque comunicativo. Se requiere certificación C1 o superior, licenciatura en idiomas y experiencia con grupos grandes. Nivel nativo es un plus.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 2500000,
        max_salary: 3800000,
        years_experience_required: 1,
        max_applicants: 50,
        benefits: ['Salud', 'Capacitación en idiomas', 'Horario flexible', 'Vacaciones docentes'],
        required_test_id: null,
      },
    ],
  },

  // ─── Construcción e Ingeniería ────────────────────────────────────────────
  {
    commercial_name: 'ConstruPro Colombia',
    industry_sector: 'Construcción',
    business_bio: 'Empresa constructora con más de 20 años en el mercado colombiano. Desarrollamos proyectos de vivienda, infraestructura vial y edificaciones comerciales con los más altos estándares de calidad y seguridad.',
    website_url: 'https://construpro.com.co',
    jobs: [
      {
        title: 'Ingeniero/a Civil de Obra',
        description: 'Dirigirás la ejecución de proyectos de construcción residencial. Supervisarás contratistas, controlarás presupuestos y cronogramas, y asegurarás el cumplimiento de normas técnicas NSR-10. Se requiere tarjeta profesional COPNIA.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 5500000,
        max_salary: 8000000,
        years_experience_required: 3,
        max_applicants: 30,
        benefits: ['Salud', 'Alimentación en obra', 'Transporte', 'Bono por proyecto'],
        required_test_id: 'big_five',
      },
      {
        title: 'Arquitecto/a de Proyectos',
        description: 'Diseñarás y supervisarás proyectos arquitectónicos desde la conceptualización hasta la construcción. Manejo de AutoCAD, Revit y BIM obligatorio. Se requiere experiencia en vivienda multifamiliar.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 5000000,
        max_salary: 7500000,
        years_experience_required: 4,
        max_applicants: 25,
        benefits: ['Salud', 'Horario flexible', 'Licencias de software', 'Capacitación BIM'],
        required_test_id: null,
      },
      {
        title: 'Maestro/a de Obra',
        description: 'Coordinarás las actividades diarias en obra: cuadrillas de trabajadores, materiales y avances. Se requiere experiencia comprobada en construcción de edificaciones y capacidad de lectura de planos.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 2500000,
        max_salary: 3500000,
        years_experience_required: 5,
        max_applicants: 40,
        benefits: ['Salud', 'Alimentación', 'Dotación', 'Prima extralegal'],
        required_test_id: null,
      },
      {
        title: 'Inspector/a SISO (Seguridad Industrial)',
        description: 'Implementarás y supervisarás el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST) en obras. Realizarás inspecciones, capacitaciones y reportes. Se requiere licencia SST vigente.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3000000,
        max_salary: 4500000,
        years_experience_required: 2,
        max_applicants: 35,
        benefits: ['Salud', 'Alimentación', 'Transporte', 'Dotación completa'],
        required_test_id: 'emotional_intelligence',
      },
    ],
  },

  // ─── Finanzas y Banca ────────────────────────────────────────────────────
  {
    commercial_name: 'FinanPlus',
    industry_sector: 'Finanzas',
    business_bio: 'Fintech colombiana que democratiza el acceso a servicios financieros mediante tecnología. Ofrecemos créditos digitales, inversiones y seguros con procesos 100% digitales y tasas competitivas.',
    website_url: 'https://finanplus.co',
    jobs: [
      {
        title: 'Analista Financiero',
        description: 'Realizarás análisis de riesgo crediticio, modelamiento financiero y reportes para la toma de decisiones. Se requiere profesional en finanzas, economía o ingeniería industrial con conocimiento en Excel avanzado y Power BI.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 6000000,
        years_experience_required: 2,
        max_applicants: 40,
        benefits: ['Salud prepagada', 'Bono trimestral', 'Home office 3 días', 'Capacitación'],
        required_test_id: 'big_five',
      },
      {
        title: 'Contador/a Público',
        description: 'Manejarás la contabilidad general de la empresa, presentación de impuestos, estados financieros y cumplimiento normativo ante la Superintendencia Financiera. Se requiere tarjeta profesional de contador vigente.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4500000,
        max_salary: 6500000,
        years_experience_required: 3,
        max_applicants: 25,
        benefits: ['Salud prepagada', 'Bono anual', 'Horario flexible', 'Capacitación tributaria'],
        required_test_id: null,
      },
      {
        title: 'Asesor/a Comercial de Créditos',
        description: 'Asesorarás clientes en productos de crédito digital. Cumplirás metas comerciales, gestionarás cartera y brindarás atención personalizada. Se valora experiencia en el sector financiero y habilidades de venta.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 2000000,
        max_salary: 3500000,
        years_experience_required: 1,
        max_applicants: 80,
        benefits: ['Salud', 'Comisiones sin techo', 'Capacitación', 'Crecimiento rápido'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Analista de Riesgo Senior',
        description: 'Desarrollarás modelos de scoring crediticio, análisis de portafolio y políticas de riesgo. Se requiere maestría en finanzas o estadística, experiencia con Python/R y conocimiento regulatorio de la Superfinanciera.',
        work_modality: 'Remote',
        country: 'Colombia',
        min_salary: 8000000,
        max_salary: 12000000,
        years_experience_required: 5,
        max_applicants: 20,
        benefits: ['Salud prepagada', 'Trabajo remoto', 'Stock options', 'Bono anual', 'Presupuesto educación'],
        required_test_id: 'big_five',
      },
    ],
  },

  // ─── Marketing y Publicidad ───────────────────────────────────────────────
  {
    commercial_name: 'Creativos LAT',
    industry_sector: 'Marketing y Publicidad',
    business_bio: 'Agencia de marketing digital y publicidad con enfoque en resultados. Trabajamos con marcas líderes en Latinoamérica creando estrategias de contenido, campañas digitales y experiencias de marca memorables.',
    website_url: 'https://creativoslat.com',
    jobs: [
      {
        title: 'Community Manager',
        description: 'Gestionarás las redes sociales de 3-4 marcas: creación de contenido, programación de publicaciones, interacción con la comunidad y reportes mensuales. Se requiere experiencia con Meta Business Suite y herramientas de scheduling.',
        work_modality: 'Remote',
        country: 'Colombia',
        min_salary: 2000000,
        max_salary: 3200000,
        years_experience_required: 1,
        max_applicants: 80,
        benefits: ['Salud', 'Trabajo remoto', 'Horario flexible', 'Cursos de marketing'],
        required_test_id: 'big_five',
      },
      {
        title: 'Diseñador/a Gráfico Senior',
        description: 'Crearás piezas gráficas para campañas digitales, branding y material POP. Dominio de Adobe Creative Suite (Photoshop, Illustrator, InDesign) y Figma. Se requiere portafolio sólido y experiencia con marcas grandes.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 6000000,
        years_experience_required: 4,
        max_applicants: 30,
        benefits: ['Salud', 'Licencias Adobe', 'Horario flexible', 'Bono por proyecto'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Especialista en Pauta Digital (SEM/Social Ads)',
        description: 'Gestionarás campañas de publicidad paga en Google Ads, Meta Ads y TikTok Ads. Optimizarás presupuestos, realizarás A/B testing y generarás reportes de ROI. Certificación Google Ads es obligatoria.',
        work_modality: 'Remote',
        country: 'Colombia',
        min_salary: 3500000,
        max_salary: 5500000,
        years_experience_required: 2,
        max_applicants: 35,
        benefits: ['Salud', 'Trabajo remoto', 'Certificaciones pagadas', 'Bono por resultados'],
        required_test_id: null,
      },
      {
        title: 'Director/a de Cuentas',
        description: 'Serás el enlace estratégico entre la agencia y los clientes. Gestionarás relaciones con cuentas clave, presentarás propuestas creativas y asegurarás la satisfacción del cliente. Se requiere experiencia en agencias y habilidades de negociación.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 6000000,
        max_salary: 9000000,
        years_experience_required: 5,
        max_applicants: 15,
        benefits: ['Salud prepagada', 'Vehículo corporativo', 'Celular', 'Bono anual', 'Viajes'],
        required_test_id: 'emotional_intelligence',
      },
    ],
  },

  // ─── Logística y Transporte ───────────────────────────────────────────────
  {
    commercial_name: 'LogiExpress',
    industry_sector: 'Logística y Transporte',
    business_bio: 'Operador logístico integral que conecta Colombia con el mundo. Ofrecemos transporte terrestre, aéreo y marítimo, almacenamiento y distribución last-mile con tecnología de rastreo en tiempo real.',
    website_url: 'https://logiexpress.com.co',
    jobs: [
      {
        title: 'Coordinador/a de Operaciones Logísticas',
        description: 'Coordinarás la operación diaria de despacho y distribución. Gestionarás rutas, flotilla de vehículos y proveedores de transporte. Se requiere experiencia en logística y conocimiento de normativa de transporte.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3500000,
        max_salary: 5000000,
        years_experience_required: 3,
        max_applicants: 30,
        benefits: ['Salud', 'Alimentación', 'Transporte', 'Bono por cumplimiento'],
        required_test_id: 'big_five',
      },
      {
        title: 'Analista de Inventarios',
        description: 'Controlarás el inventario en bodega: entradas, salidas, conteos cíclicos y conciliaciones. Manejo de WMS (Warehouse Management System) y Excel avanzado. Se requiere tecnólogo o profesional en logística o ingeniería industrial.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 2200000,
        max_salary: 3200000,
        years_experience_required: 1,
        max_applicants: 50,
        benefits: ['Salud', 'Alimentación', 'Ruta de transporte', 'Estabilidad'],
        required_test_id: null,
      },
      {
        title: 'Conductor/a de Vehículo de Carga',
        description: 'Transporte de mercancía en rutas nacionales con vehículo tipo turbo o sencillo. Se requiere licencia C2 o C3 vigente, curso de manejo defensivo y conocimiento de rutas nacionales.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 2000000,
        max_salary: 2800000,
        years_experience_required: 2,
        max_applicants: 100,
        benefits: ['Salud', 'Viáticos', 'Dotación', 'Prima extralegal'],
        required_test_id: null,
      },
      {
        title: 'Jefe de Almacén',
        description: 'Liderarás la operación de almacenamiento: recepción, almacenaje, picking y despacho. Gestionarás un equipo de 15+ operarios y asegurarás el cumplimiento de indicadores de productividad y exactitud de inventario.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 5500000,
        years_experience_required: 4,
        max_applicants: 20,
        benefits: ['Salud', 'Alimentación', 'Transporte', 'Bono semestral'],
        required_test_id: 'emotional_intelligence',
      },
    ],
  },

  // ─── Gastronomía y Restaurantes ───────────────────────────────────────────
  {
    commercial_name: 'Sabor & Arte Restaurantes',
    industry_sector: 'Gastronomía',
    business_bio: 'Grupo gastronómico con 8 restaurantes en Bogotá y Medellín. Nuestra propuesta une la cocina colombiana tradicional con técnicas contemporáneas. Reconocidos por el Ministerio de Cultura como patrimonio gastronómico.',
    website_url: 'https://saboryarte.com.co',
    jobs: [
      {
        title: 'Chef Ejecutivo',
        description: 'Liderarás la cocina de nuestro restaurante insignia. Diseñarás menús, controlarás costos de alimentos, supervisarás al equipo de cocina y mantendrás los estándares de calidad. Se requiere formación culinaria profesional y mínimo 5 años en cocinas de alto nivel.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 5000000,
        max_salary: 8000000,
        years_experience_required: 5,
        max_applicants: 15,
        benefits: ['Salud', 'Alimentación', 'Propinas', 'Bono por ventas', 'Capacitación internacional'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Bartender / Mixólogo',
        description: 'Crearás y prepararás coctelería de autor y clásica en nuestro bar. Se requiere conocimiento en destilados, técnicas de mixología y atención al cliente premium. Certificación en bartending es un plus.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 1800000,
        max_salary: 2800000,
        years_experience_required: 1,
        max_applicants: 40,
        benefits: ['Alimentación', 'Propinas', 'Horario nocturno', 'Capacitación'],
        required_test_id: null,
      },
      {
        title: 'Administrador/a de Restaurante',
        description: 'Gestionarás la operación completa de un punto: personal, inventarios, proveedores, servicio al cliente y cumplimiento de metas de ventas. Se requiere experiencia en administración de restaurantes y liderazgo de equipos.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3500000,
        max_salary: 5000000,
        years_experience_required: 3,
        max_applicants: 20,
        benefits: ['Salud', 'Alimentación', 'Bono por ventas', 'Celular corporativo'],
        required_test_id: 'big_five',
      },
    ],
  },

  // ─── Derecho / Legal ──────────────────────────────────────────────────────
  {
    commercial_name: 'Rodríguez & Asociados Abogados',
    industry_sector: 'Legal',
    business_bio: 'Firma de abogados especializada en derecho corporativo, laboral y tributario con 25 años de trayectoria. Representamos empresas nacionales y multinacionales con presencia en Bogotá, Medellín y Barranquilla.',
    website_url: 'https://rodriguezasociados.com.co',
    jobs: [
      {
        title: 'Abogado/a Laboralista Junior',
        description: 'Asesorarás a empresas clientes en temas de derecho laboral: contratos, nómina, procesos disciplinarios y representación ante el Ministerio de Trabajo. Se requiere tarjeta profesional y conocimiento del Código Sustantivo del Trabajo.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 3000000,
        max_salary: 4500000,
        years_experience_required: 1,
        max_applicants: 30,
        benefits: ['Salud prepagada', 'Horario flexible', 'Capacitación jurídica', 'Toga corporativa'],
        required_test_id: 'big_five',
      },
      {
        title: 'Abogado/a Corporativo Senior',
        description: 'Liderarás operaciones de M&A, due diligence y estructuración societaria para clientes corporativos. Se requiere especialización en derecho comercial y mínimo 5 años en firmas de abogados o áreas legales corporativas.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 8000000,
        max_salary: 14000000,
        years_experience_required: 5,
        max_applicants: 10,
        benefits: ['Salud prepagada', 'Bono anual', 'Parqueadero', 'Membresía gimnasio', 'Educación continua'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Paralegal / Asistente Jurídico',
        description: 'Apoyarás a los abogados en investigación jurídica, preparación de documentos legales, seguimiento de procesos judiciales y gestión documental. Se requiere tecnólogo en gestión judicial o estudiante de últimos semestres de derecho.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 1800000,
        max_salary: 2500000,
        years_experience_required: 0,
        max_applicants: 50,
        benefits: ['Salud', 'Horario estable', 'Capacitación', 'Posibilidad de crecimiento'],
        required_test_id: null,
      },
    ],
  },

  // ─── Agricultura / Agroindustria ──────────────────────────────────────────
  {
    commercial_name: 'AgroVerde del Campo',
    industry_sector: 'Agroindustria',
    business_bio: 'Empresa agroindustrial dedicada al cultivo, procesamiento y exportación de frutas tropicales. Operamos fincas en el Eje Cafetero y Valle del Cauca con prácticas sostenibles y certificación orgánica.',
    website_url: 'https://agroverde.com.co',
    jobs: [
      {
        title: 'Ingeniero/a Agrónomo',
        description: 'Supervisarás los cultivos de aguacate y mango: planes de fertilización, control fitosanitario, cosecha y poscosecha. Se requiere conocimiento en agricultura de precisión y certificaciones GlobalGAP.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3500000,
        max_salary: 5500000,
        years_experience_required: 2,
        max_applicants: 25,
        benefits: ['Salud', 'Alimentación', 'Vivienda en finca', 'Transporte'],
        required_test_id: 'big_five',
      },
      {
        title: 'Supervisor/a de Planta de Procesamiento',
        description: 'Coordinarás la operación de la planta de procesamiento de frutas: selección, empaque y despacho para exportación. Asegurarás cumplimiento de normas BPM y HACCP. Se requiere ingeniero de alimentos o industrial.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 3000000,
        max_salary: 4500000,
        years_experience_required: 2,
        max_applicants: 20,
        benefits: ['Salud', 'Alimentación', 'Transporte', 'Bono por producción'],
        required_test_id: null,
      },
      {
        title: 'Coordinador/a de Comercio Exterior',
        description: 'Gestionarás los procesos de exportación: documentación aduanera, coordinación con navieras, certificados de origen y facturación internacional. Se requiere profesional en comercio internacional y conocimiento de normativa DIAN.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 6000000,
        years_experience_required: 3,
        max_applicants: 15,
        benefits: ['Salud', 'Horario flexible', 'Viajes internacionales', 'Bono trimestral'],
        required_test_id: 'emotional_intelligence',
      },
    ],
  },

  // ─── Energía y Medio Ambiente ─────────────────────────────────────────────
  {
    commercial_name: 'SolEnergía Renovable',
    industry_sector: 'Energía Renovable',
    business_bio: 'Empresa líder en energía solar en Colombia. Diseñamos, instalamos y mantenemos sistemas fotovoltaicos para hogares, empresas e industrias. Comprometidos con la transición energética y la sostenibilidad.',
    website_url: 'https://solenergia.co',
    jobs: [
      {
        title: 'Ingeniero/a de Proyectos Solares',
        description: 'Diseñarás sistemas fotovoltaicos: dimensionamiento, selección de equipos, simulaciones (PVsyst) y supervisión de instalación. Se requiere ingeniero eléctrico o electrónico con conocimiento en energía solar.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4500000,
        max_salary: 7000000,
        years_experience_required: 2,
        max_applicants: 25,
        benefits: ['Salud', 'Transporte', 'Capacitación técnica', 'Bono por proyecto'],
        required_test_id: 'big_five',
      },
      {
        title: 'Técnico/a Instalador Solar',
        description: 'Instalarás paneles solares, inversores y sistemas de montaje en techos y suelo. Se requiere técnico o tecnólogo eléctrico, curso de trabajo en alturas vigente y experiencia en instalaciones eléctricas.',
        work_modality: 'On-site',
        country: 'Colombia',
        min_salary: 2000000,
        max_salary: 3000000,
        years_experience_required: 1,
        max_applicants: 60,
        benefits: ['Salud', 'Dotación completa', 'Viáticos', 'Capacitación'],
        required_test_id: null,
      },
      {
        title: 'Asesor/a Comercial de Energía Solar',
        description: 'Visitarás clientes potenciales, realizarás evaluaciones de consumo energético y presentarás propuestas comerciales de sistemas solares. Se requiere habilidades comerciales y conocimiento básico de energía renovable.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 2000000,
        max_salary: 3500000,
        years_experience_required: 1,
        max_applicants: 50,
        benefits: ['Salud', 'Comisiones', 'Vehículo corporativo', 'Celular'],
        required_test_id: 'emotional_intelligence',
      },
      {
        title: 'Especialista en Gestión Ambiental',
        description: 'Elaborarás estudios de impacto ambiental, planes de manejo y reportes de sostenibilidad para nuestros proyectos. Se requiere ingeniero ambiental con conocimiento en normativa ambiental colombiana y licencias ANLA.',
        work_modality: 'Hybrid',
        country: 'Colombia',
        min_salary: 4000000,
        max_salary: 6000000,
        years_experience_required: 3,
        max_applicants: 20,
        benefits: ['Salud', 'Horario flexible', 'Trabajo de campo', 'Capacitación'],
        required_test_id: null,
      },
    ],
  },
]

async function seed() {
  let totalJobs = 0
  const companyIds = []

  for (const company of companies) {
    const { jobs, ...companyData } = company

    // Create company
    const companyRef = await addDoc(collection(db, 'companies'), {
      ...companyData,
      created_at: serverTimestamp(),
    })
    companyIds.push({ id: companyRef.id, name: companyData.commercial_name })
    console.log(`\n✓ Empresa: ${companyData.commercial_name} (${companyData.industry_sector}) → ${companyRef.id}`)

    // Create job offers
    for (const job of jobs) {
      const jobRef = await addDoc(collection(db, 'job_offers'), {
        ...job,
        company_id: companyRef.id,
        status: 'Active',
        created_at: serverTimestamp(),
        application_deadline: null,
      })
      totalJobs++
      console.log(`    [${totalJobs}] ${job.title} → ${jobRef.id}`)
    }
  }

  console.log(`\n════════════════════════════════════════`)
  console.log(`Resumen:`)
  console.log(`  Empresas creadas: ${companies.length}`)
  console.log(`  Ofertas creadas:  ${totalJobs}`)
  console.log(`════════════════════════════════════════`)
  console.log(`\nEmpresas:`)
  companyIds.forEach(c => console.log(`  ${c.name} → ${c.id}`))
  console.log('\nDone!')
  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
