import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Mock context
vi.mock('../../context/CompanyContext', () => ({
  useCompany: () => ({
    company: { id: 'comp-1', commercial_name: 'TestCorp' },
    currentUserRole: 'admin',
  }),
}))

// Mock services
const mockGetJob = vi.fn()
const mockGetApplicationsByJobPaginated = vi.fn()
const mockGetCandidate = vi.fn()
const mockGetCompanyUsers = vi.fn()

vi.mock('../../services/jobs', () => ({
  getJob: (...args) => mockGetJob(...args),
}))

vi.mock('../../services/applications', () => ({
  getApplicationsByJob: vi.fn(() => Promise.resolve([])),
  getApplicationsByJobPaginated: (...args) => mockGetApplicationsByJobPaginated(...args),
  updateApplicationStatus: vi.fn(() => Promise.resolve()),
  assignReviewer: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../services/candidates', () => ({
  getCandidate: (...args) => mockGetCandidate(...args),
}))

vi.mock('../../services/companies', () => ({
  getCompanyUsers: (...args) => mockGetCompanyUsers(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}))

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}))

import ApplicantList from '../company/ApplicantList'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCompanyUsers.mockResolvedValue([])
})

function renderApplicantList(jobId = 'job-1') {
  return render(
    <MemoryRouter initialEntries={[`/company/jobs/${jobId}/applicants`]}>
      <Routes>
        <Route path="/company/jobs/:jobId/applicants" element={<ApplicantList />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ApplicantList', () => {
  it('shows skeleton while loading', () => {
    mockGetJob.mockReturnValue(new Promise(() => {}))
    mockGetApplicationsByJobPaginated.mockReturnValue(new Promise(() => {}))
    renderApplicantList()
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders job title and applicants after loading', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job-1', title: 'Frontend Developer', status: 'Active',
      country: 'Mexico', work_modality: 'Remote',
      min_salary: 20000, max_salary: 40000,
    })
    mockGetApplicationsByJobPaginated.mockResolvedValue({
      applications: [
        { id: 'app-1', candidate_id: 'c1', status: 'Pending', applied_at: { seconds: Date.now() / 1000, toDate: () => new Date() } },
      ],
      lastDoc: null,
      hasMore: false,
    })
    mockGetCandidate.mockResolvedValue({
      first_name: 'Ana', last_name: 'López', city: 'CDMX',
    })

    renderApplicantList()

    await waitFor(() => {
      expect(screen.getByText('Frontend Developer')).toBeTruthy()
    })
    expect(screen.getByText('Ana López')).toBeTruthy()
  })

  it('shows empty state when no applicants', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job-1', title: 'QA Engineer', status: 'Active',
      country: 'Colombia', work_modality: 'Hybrid',
      min_salary: 15000, max_salary: 30000,
    })
    mockGetApplicationsByJobPaginated.mockResolvedValue({
      applications: [],
      lastDoc: null,
      hasMore: false,
    })

    renderApplicantList()

    await waitFor(() => {
      expect(screen.getByText('company.applicants.empty')).toBeTruthy()
    })
  })
})
