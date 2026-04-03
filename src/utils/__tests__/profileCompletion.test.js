import { describe, it, expect } from 'vitest'
import { computeProfileCompletion } from '../profileCompletion'

describe('computeProfileCompletion', () => {
  it('returns 0 for empty object', () => {
    expect(computeProfileCompletion({})).toBe(0)
  })

  it('returns 0 for all empty strings', () => {
    expect(computeProfileCompletion({
      first_name: '', last_name: '', phone: '',
      city: '', country: '', identification_type: '', identification_number: '',
    })).toBe(0)
  })

  it('returns 0 for whitespace-only values', () => {
    expect(computeProfileCompletion({ first_name: '   ', last_name: '  ' })).toBe(0)
  })

  it('calculates partial basic fields correctly', () => {
    // 2 out of 7 fields = (2/7)*60 ≈ 17
    expect(computeProfileCompletion({ first_name: 'Ana', last_name: 'López' })).toBe(17)
  })

  it('returns 60 when all basic fields filled, no resume', () => {
    expect(computeProfileCompletion({
      first_name: 'Ana',
      last_name: 'López',
      phone: '555-1234',
      city: 'CDMX',
      country: 'MX',
      identification_type: 'INE',
      identification_number: '123456',
    })).toBe(60)
  })

  it('returns 40 for no basic fields but has resume', () => {
    expect(computeProfileCompletion({}, 1)).toBe(40)
  })

  it('returns 100 when all fields filled and has resume', () => {
    expect(computeProfileCompletion({
      first_name: 'Ana',
      last_name: 'López',
      phone: '555-1234',
      city: 'CDMX',
      country: 'MX',
      identification_type: 'INE',
      identification_number: '123456',
    }, 1)).toBe(100)
  })

  it('returns 100 with multiple resumes', () => {
    expect(computeProfileCompletion({
      first_name: 'Ana',
      last_name: 'López',
      phone: '555-1234',
      city: 'CDMX',
      country: 'MX',
      identification_type: 'INE',
      identification_number: '123456',
    }, 5)).toBe(100)
  })

  it('handles single field with resume', () => {
    // 1/7 * 60 ≈ 9, + 40 = 49
    expect(computeProfileCompletion({ first_name: 'Ana' }, 1)).toBe(49)
  })
})
