import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase/config
vi.mock('../../firebase/config', () => ({ db: {} }))

// Mock firebase/firestore
const mockGetDocs = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockDeleteDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection'),
  doc: vi.fn(() => 'mock-doc'),
  query: vi.fn(() => 'mock-query'),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  serverTimestamp: vi.fn(() => 'TIMESTAMP'),
}))

import {
  getOrCreateDraftApplication,
  updateApplication,
  submitApplication,
  getApplicationsByCandidate,
  getApplicationsByJob,
  updateApplicationStatus,
  getApplication,
  deleteApplication,
  assignReviewer,
} from '../applications'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getOrCreateDraftApplication', () => {
  it('returns existing draft if found', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'app-123', data: () => ({ status: 'Draft', candidate_id: 'c1', job_offer_id: 'j1' }) }],
    })

    const result = await getOrCreateDraftApplication('c1', 'j1')
    expect(result.id).toBe('app-123')
    expect(result.status).toBe('Draft')
  })

  it('creates new draft when none exists', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    mockAddDoc.mockResolvedValue({ id: 'new-app-456' })

    const result = await getOrCreateDraftApplication('c1', 'j1')
    expect(result.id).toBe('new-app-456')
    expect(result.status).toBe('Draft')
    expect(result.current_step).toBe('cv_selection')
    expect(mockAddDoc).toHaveBeenCalledOnce()
  })
})

describe('updateApplication', () => {
  it('calls updateDoc with correct data and timestamp', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateApplication('app-1', { resume_id: 'r1' })
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc', {
      resume_id: 'r1',
      updated_at: 'TIMESTAMP',
    })
  })
})

describe('submitApplication', () => {
  it('sets status to Pending and step to submitted', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await submitApplication('app-1')
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc', {
      status: 'Pending',
      current_step: 'submitted',
      applied_at: 'TIMESTAMP',
      updated_at: 'TIMESTAMP',
    })
  })
})

describe('getApplicationsByCandidate', () => {
  it('returns mapped applications', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a1', data: () => ({ status: 'Pending', job_offer_id: 'j1' }) },
        { id: 'a2', data: () => ({ status: 'Draft', job_offer_id: 'j2' }) },
      ],
    })

    const result = await getApplicationsByCandidate('c1')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'a1', status: 'Pending', job_offer_id: 'j1' })
    expect(result[1]).toEqual({ id: 'a2', status: 'Draft', job_offer_id: 'j2' })
  })
})

describe('getApplicationsByJob', () => {
  it('returns mapped applications', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a1', data: () => ({ status: 'Pending', candidate_id: 'c1' }) },
      ],
    })

    const result = await getApplicationsByJob('j1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a1')
  })
})

describe('updateApplicationStatus', () => {
  it('updates status without feedback', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateApplicationStatus('app-1', 'Reviewed')
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc', {
      status: 'Reviewed',
      updated_at: 'TIMESTAMP',
    })
  })

  it('includes feedback when provided', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateApplicationStatus('app-1', 'Rejected', 'Not a fit')
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc', {
      status: 'Rejected',
      updated_at: 'TIMESTAMP',
      feedback_to_candidate: 'Not a fit',
    })
  })
})

describe('getApplication', () => {
  it('returns application if exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'app-1',
      data: () => ({ status: 'Pending' }),
    })

    const result = await getApplication('app-1')
    expect(result).toEqual({ id: 'app-1', status: 'Pending' })
  })

  it('returns null if not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    const result = await getApplication('nonexistent')
    expect(result).toBeNull()
  })
})

describe('deleteApplication', () => {
  it('calls deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)
    await deleteApplication('app-1')
    expect(mockDeleteDoc).toHaveBeenCalledOnce()
  })
})

describe('assignReviewer', () => {
  it('sets reviewer_id and timestamp', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await assignReviewer('app-1', 'user-42')
    expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc', {
      reviewer_id: 'user-42',
      updated_at: 'TIMESTAMP',
    })
  })
})
