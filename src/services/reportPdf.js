import jsPDF from 'jspdf'

const BRAND = [61, 127, 195] // #3D7FC3
const GRAY = [100, 116, 139]
const DARK = [30, 41, 59]
const GREEN = [34, 197, 94]
const RED = [239, 68, 68]
const ORANGE = [249, 115, 22]

function scoreColor(val) {
  if (val >= 70) return GREEN
  if (val >= 40) return ORANGE
  return RED
}

/**
 * Generate a PDF report for a candidate's application.
 */
export function generateCandidateReport({ candidate, job, company, fitCheck, testResults, resumeData, combinedScore }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 18
  const contentW = W - margin * 2
  let y = 0

  // ── Header bar ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, W, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('candydatos', margin, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Reporte de Evaluación de Candidato', margin, 22)

  // Company name on the right
  if (company?.commercial_name) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(company.commercial_name, W - margin, 14, { align: 'right' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(company.industry_sector || '', W - margin, 21, { align: 'right' })
  }

  // Date
  doc.setFontSize(7)
  doc.text(new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }), W - margin, 28, { align: 'right' })

  y = 40

  // ── Candidate info ──────────────────────────────────────────────────────
  const candidateName = [candidate?.first_name, candidate?.last_name].filter(Boolean).join(' ') || 'Candidato'

  // Combined score circle on the right
  if (combinedScore > 0) {
    const cx = W - margin - 15
    const cy = y + 8
    const [r, g, b] = scoreColor(combinedScore)
    doc.setDrawColor(r, g, b)
    doc.setLineWidth(1.5)
    doc.circle(cx, cy, 12)
    doc.setTextColor(r, g, b)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(String(combinedScore), cx, cy + 2, { align: 'center' })
    doc.setFontSize(6)
    doc.setTextColor(...GRAY)
    doc.text('SCORE', cx, cy + 7, { align: 'center' })
  }

  doc.setTextColor(...DARK)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(candidateName, margin, y + 4)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND)
  doc.text(job?.title || '', margin, y + 11)

  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const infoLine = [candidate?.email, candidate?.phone, candidate?.city].filter(Boolean).join('  |  ')
  doc.text(infoLine, margin, y + 18)

  y += 26

  // Divider
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.3)
  doc.line(margin, y, W - margin, y)
  y += 6

  // ── Fit Check Section ───────────────────────────────────────────────────
  if (fitCheck) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Fit Check — Compatibilidad con la Oferta', margin, y)
    y += 7

    // Score + status
    const [fr, fg, fb] = scoreColor(fitCheck.score)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(fr, fg, fb)
    doc.text(`${fitCheck.score}/100`, margin, y + 2)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(fitCheck.passed ? 'Aprobado' : 'No aprobado', margin + 32, y - 1)

    // Sub-scores
    const subScores = [
      { label: 'Experiencia', value: fitCheck.experience_score },
      { label: 'Habilidades', value: fitCheck.skills_score },
      { label: 'Educación', value: fitCheck.education_score },
    ]

    let sx = margin + 65
    subScores.forEach(s => {
      if (s.value == null) return
      const [sr, sg, sb] = scoreColor(s.value)
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(s.label, sx, y - 5)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(sr, sg, sb)
      doc.text(`${s.value}%`, sx, y + 2)
      doc.setFont('helvetica', 'normal')
      sx += 35
    })

    y += 10

    // Feedback
    if (fitCheck.feedback) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(fitCheck.feedback, contentW)
      doc.text(lines, margin, y)
      y += lines.length * 3.5 + 2
    }

    // Skills matched/missing
    if (fitCheck.skills_matched?.length > 0 || fitCheck.skills_missing?.length > 0) {
      y += 2
      if (fitCheck.skills_matched?.length > 0) {
        doc.setFontSize(7)
        doc.setTextColor(...GREEN)
        doc.text('✓ ' + fitCheck.skills_matched.join(', '), margin, y)
        y += 4
      }
      if (fitCheck.skills_missing?.length > 0) {
        doc.setFontSize(7)
        doc.setTextColor(...RED)
        doc.text('✗ ' + fitCheck.skills_missing.join(', '), margin, y)
        y += 4
      }
    }

    y += 4
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y, W - margin, y)
    y += 6
  }

  // ── Interview Results Section ───────────────────────────────────────────
  const tr = testResults?.[0]
  if (tr) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Entrevista AI — Evaluación del Agente', margin, y)
    y += 7

    // Score
    const [ir, ig, ib] = scoreColor(tr.score)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(ir, ig, ib)
    doc.text(`${tr.score}/100`, margin, y + 2)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(tr.gemini_evaluation?.passed ? 'Aprobado' : 'No aprobado', margin + 32, y - 1)
    y += 10

    // Trait score bars
    if (tr.trait_scores) {
      const traits = Object.entries(tr.trait_scores)
      const barW = contentW - 40
      traits.forEach(([trait, val]) => {
        // Label
        doc.setFontSize(7)
        doc.setTextColor(...GRAY)
        const label = trait.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        doc.text(label, margin, y + 1)

        // Bar background
        doc.setFillColor(230, 230, 230)
        doc.roundedRect(margin + 40, y - 2, barW, 4, 2, 2, 'F')

        // Bar fill
        const [br, bg, bb] = scoreColor(val)
        doc.setFillColor(br, bg, bb)
        doc.roundedRect(margin + 40, y - 2, barW * (val / 100), 4, 2, 2, 'F')

        // Value
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...DARK)
        doc.text(`${val}%`, W - margin, y + 1, { align: 'right' })
        doc.setFont('helvetica', 'normal')

        y += 7
      })
    }

    y += 2

    // Feedback
    if (tr.gemini_evaluation?.feedback) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(tr.gemini_evaluation.feedback, contentW)
      doc.text(lines, margin, y)
      y += lines.length * 3.5 + 2
    }

    y += 4
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y, W - margin, y)
    y += 6
  }

  // ── AI Recommendation ───────────────────────────────────────────────────
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Recomendación AI', margin, y)
  y += 7

  let recommendation, recColor
  if (combinedScore >= 70) {
    recommendation = 'RECOMENDADO — El candidato muestra un perfil altamente compatible con la oferta. Se sugiere avanzar en el proceso de selección.'
    recColor = GREEN
  } else if (combinedScore >= 50) {
    recommendation = 'CON RESERVAS — El candidato cumple parcialmente con el perfil. Se recomienda evaluar en áreas específicas antes de tomar una decisión.'
    recColor = ORANGE
  } else {
    recommendation = 'NO RECOMENDADO — El candidato no cumple con los requisitos mínimos del perfil. Se sugiere considerar otros candidatos.'
    recColor = RED
  }

  doc.setFillColor(...recColor)
  doc.roundedRect(margin, y - 3, contentW, 14, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  const recLines = doc.splitTextToSize(recommendation, contentW - 10)
  doc.text(recLines, margin + 5, y + 3)

  // ── Footer ──────────────────────────────────────────────────────────────
  const footerY = 285
  doc.setDrawColor(230, 230, 230)
  doc.line(margin, footerY - 5, W - margin, footerY - 5)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text('Generado por candydatos AI — Evaluación automatizada con inteligencia artificial', margin, footerY)
  doc.text(`${new Date().toLocaleString('es-CO')}`, W - margin, footerY, { align: 'right' })
  doc.setFontSize(6)
  doc.text('Este reporte es un análisis automatizado y debe complementarse con el criterio humano del equipo de selección.', margin, footerY + 4)

  // ── Save ────────────────────────────────────────────────────────────────
  const fileName = `Reporte_${candidateName.replace(/\s+/g, '_')}_${job?.title?.replace(/\s+/g, '_') || 'oferta'}.pdf`
  doc.save(fileName)
}
