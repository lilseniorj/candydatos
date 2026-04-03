import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock context
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    firebaseUser: { uid: 'test-user-1' },
    userDoc: { profile_completion_pct: 100 },
  }),
}))

// Mock services
const mockGetActiveJobsPaginated = vi.fn()
const mockGetApplicationsByCandidate = vi.fn()
const mockGetCompany = vi.fn()

vi.mock('../../services/jobs', () => ({
  getActiveJobs: vi.fn(() => Promise.resolve([])),
  getActiveJobsPaginated: (...args) => mockGetActiveJobsPaginated(...args),
}))

vi.mock('../../services/applications', () => ({
  getApplicationsByCandidate: (...args) => mockGetApplicationsByCandidate(...args),
}))

vi.mock('../../services/companies', () => ({
  getCompany: (...args) => mockGetCompany(...args),
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}))

import JobBoard from '../candidate/JobBoard'

beforeEach(() => {
  vi.clearAllMocks()
})

function renderJobBoard() {
  return render(
    <MemoryRouter>
      <JobBoard />
    </MemoryRouter>
  )
}

describe('JobBoard', () => {
  it('shows skeleton while loading', () => {
    mockGetActiveJobsPaginated.mockReturnValue(new Promise(() => {})) // never resolves
    mockGetApplicationsByCandidate.mockReturnValue(new Promise(() => {}))
    renderJobBoard()
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders jobs after loading', async () => {
    mockGetActiveJobsPaginated.mockResolvedValue({
      jobs: [
        {
          id: 'j1', title: 'React Developer', country: 'Mexico',
          company_id: 'c1', status: 'Active', work_modality: 'Remote',
          min_salary: 30000, max_salary: 50000,
          created_at: { seconds: Date.now() / 1000, toDate: () => new Date() },
        },
      ],
      lastDoc: null,
      hasMore: false,
    })
    mockGetApplicationsByCandidate.mockResolvedValue([])
    mockGetCompany.mockResolvedValue({ id: 'c1', commercial_name: 'TechCorp' })

    renderJobBoard()

    await waitFor(() => {
      expect(screen.getAllByText('React Developer').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('TechCorp').length).toBeGreaterThan(0)
  })

  it('shows empty state when no jobs', async () => {
    mockGetActiveJobsPaginated.mockResolvedValue({ jobs: [], lastDoc: null, hasMore: false })
    mockGetApplicationsByCandidate.mockResolvedValue([])

    renderJobBoard()

    await waitFor(() => {
      expect(screen.getByText('candidate.jobs.empty')).toBeTruthy()
    })
  })

  it('marks applied jobs correctly', async () => {
    mockGetActiveJobsPaginated.mockResolvedValue({
      jobs: [
        {
          id: 'j1', title: 'Applied Job', country: 'MX', company_id: 'c1',
          status: 'Active', work_modality: 'Remote',
          min_salary: 0, max_salary: 0,
          created_at: { seconds: Date.now() / 1000, toDate: () => new Date() },
        },
      ],
      lastDoc: null,
      hasMore: false,
    })
    mockGetApplicationsByCandidate.mockResolvedValue([
      { job_offer_id: 'j1', status: 'Pending' },
    ])
    mockGetCompany.mockResolvedValue({ id: 'c1', commercial_name: 'Corp' })

    renderJobBoard()

    await waitFor(() => {
      expect(screen.getAllByText('candidate.jobs.applied').length).toBeGreaterThan(0)
    })
  })

  it('shows load more button when hasMore is true', async () => {
    mockGetActiveJobsPaginated.mockResolvedValue({
      jobs: Array.from({ length: 20 }, (_, i) => ({
        id: `j${i}`, title: `Job ${i}`, country: 'MX', company_id: 'c1',
        status: 'Active', work_modality: 'Remote',
        min_salary: 0, max_salary: 0,
        created_at: { seconds: Date.now() / 1000, toDate: () => new Date() },
      })),
      lastDoc: 'some-doc',
      hasMore: true,
    })
    mockGetApplicationsByCandidate.mockResolvedValue([])
    mockGetCompany.mockResolvedValue({ id: 'c1', commercial_name: 'Corp' })

    renderJobBoard()

    await waitFor(() => {
      expect(screen.getByText('common.loadMore')).toBeTruthy()
    })
  })
})
