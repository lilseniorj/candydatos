import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../firebase/config', () => ({ db: {} }))

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
  Timestamp: { fromDate: vi.fn(d => ({ toDate: () => d })) },
}))

import { createJob, updateJob, deleteJob, getJobsByCompany, getActiveJobs, getJob, getActiveJobsPaginated } from '../jobs'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createJob', () => {
  it('creates job and returns id', async () => {
    mockAddDoc.mockResolvedValue({ id: 'job-new' })
    const id = await createJob('company-1', { title: 'React Dev', description: 'Build UI' })
    expect(id).toBe('job-new')
    expect(mockAddDoc).toHaveBeenCalledOnce()
  })
})

describe('updateJob', () => {
  it('calls updateDoc', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateJob('job-1', { title: 'Updated Title' })
    expect(mockUpdateDoc).toHaveBeenCalledOnce()
  })
})

describe('deleteJob', () => {
  it('calls deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)
    await deleteJob('job-1')
    expect(mockDeleteDoc).toHaveBeenCalledOnce()
  })
})

describe('getJobsByCompany', () => {
  it('returns jobs for a company', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'j1', data: () => ({ title: 'Dev', company_id: 'c1' }) },
        { id: 'j2', data: () => ({ title: 'QA', company_id: 'c1' }) },
      ],
    })
    const result = await getJobsByCompany('c1')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Dev')
  })
})

describe('getActiveJobs', () => {
  it('returns only active jobs', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'j1', data: () => ({ title: 'Active Job', status: 'Active' }) },
      ],
    })
    const result = await getActiveJobs()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Active Job')
  })
})

describe('getActiveJobsPaginated', () => {
  it('returns paginated results with hasMore flag', async () => {
    const docs = Array.from({ length: 20 }, (_, i) => ({
      id: `j${i}`,
      data: () => ({ title: `Job ${i}` }),
    }))
    mockGetDocs.mockResolvedValue({ docs })

    const result = await getActiveJobsPaginated()
    expect(result.jobs).toHaveLength(20)
    expect(result.hasMore).toBe(true)
    expect(result.lastDoc).toBeDefined()
  })

  it('returns hasMore=false when less than page size', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'j1', data: () => ({ title: 'Only Job' }) }],
    })
    const result = await getActiveJobsPaginated()
    expect(result.jobs).toHaveLength(1)
    expect(result.hasMore).toBe(false)
  })

  it('returns empty when no jobs', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] })
    const result = await getActiveJobsPaginated()
    expect(result.jobs).toHaveLength(0)
    expect(result.hasMore).toBe(false)
    expect(result.lastDoc).toBeNull()
  })
})

describe('getJob', () => {
  it('returns job if exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'j1',
      data: () => ({ title: 'Dev', status: 'Active' }),
    })
    const result = await getJob('j1')
    expect(result).toEqual({ id: 'j1', title: 'Dev', status: 'Active' })
  })

  it('returns null if not found', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    const result = await getJob('nonexistent')
    expect(result).toBeNull()
  })
})
