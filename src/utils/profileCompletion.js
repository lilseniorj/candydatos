const BASIC_FIELDS = ['first_name', 'last_name', 'phone', 'city', 'country', 'identification_type', 'identification_number']

export function computeProfileCompletion(candidateData, resumeCount = 0) {
  const filledFields = BASIC_FIELDS.filter(f => candidateData[f] && String(candidateData[f]).trim() !== '')
  const basicPct     = (filledFields.length / BASIC_FIELDS.length) * 60
  const resumePct    = resumeCount > 0 ? 40 : 0
  return Math.round(basicPct + resumePct)
}
