import { createBrowserRouter } from 'react-router-dom'

// Layouts
import AuthLayout      from '../layouts/AuthLayout'
import CompanyLayout   from '../layouts/CompanyLayout'
import CandidateLayout from '../layouts/CandidateLayout'

// Guards
import CompanyGuard   from './guards/CompanyGuard'
import CandidateGuard from './guards/CandidateGuard'
import AuthGuard      from './guards/AuthGuard'

// Public
import LandingPage from '../pages/public/LandingPage'
import SeedPage    from '../pages/SeedPage'

// Auth pages
import CompanyLogin     from '../pages/auth/CompanyLogin'
import CompanyRegister  from '../pages/auth/CompanyRegister'
import CandidateLogin   from '../pages/auth/CandidateLogin'
import CandidateRegister from '../pages/auth/CandidateRegister'

// Company pages
import CompanySetup     from '../pages/company/CompanySetup'
import CompanyDashboard from '../pages/company/CompanyDashboard'
import JobList          from '../pages/company/JobList'
import ApplicantList    from '../pages/company/ApplicantList'
import Analytics        from '../pages/company/Analytics'
import TestManager      from '../pages/company/TestManager'
import CompanySettings  from '../pages/company/CompanySettings'
import JobEdit          from '../pages/company/JobEdit'
import ApplicantDetail  from '../pages/company/ApplicantDetail'

// Candidate pages
import CandidateProfile from '../pages/candidate/CandidateProfile'
import ResumeList       from '../pages/candidate/ResumeList'
import ResumeDetail     from '../pages/candidate/ResumeDetail'
import JobBoard         from '../pages/candidate/JobBoard'
import ApplyFlow        from '../pages/candidate/ApplyFlow'
import MyApplications   from '../pages/candidate/MyApplications'

const router = createBrowserRouter([
  // Landing
  { path: '/', element: <LandingPage /> },

  // Seed (temporary — remove after use)
  { path: '/seed', element: <SeedPage /> },

  // Company auth
  {
    element: <AuthGuard portal="company" />,
    children: [{
      element: <AuthLayout />,
      children: [
        { path: '/company/login',    element: <CompanyLogin /> },
        { path: '/company/register', element: <CompanyRegister /> },
      ],
    }],
  },

  // Company setup (no layout guard — needs special check)
  {
    path: '/company/setup',
    element: <CompanySetup />,
  },

  // Company protected
  {
    element: <CompanyGuard />,
    children: [{
      element: <CompanyLayout />,
      children: [
        { path: '/company/dashboard',               element: <CompanyDashboard /> },
        { path: '/company/jobs',                    element: <JobList /> },
        { path: '/company/jobs/:jobId/edit',         element: <JobEdit /> },
        { path: '/company/jobs/:jobId/applicants',              element: <ApplicantList /> },
        { path: '/company/jobs/:jobId/applicants/:appId',      element: <ApplicantDetail /> },
        { path: '/company/tests',                   element: <TestManager /> },
        { path: '/company/analytics',               element: <Analytics /> },
        { path: '/company/settings',               element: <CompanySettings /> },
      ],
    }],
  },

  // Candidate auth
  {
    element: <AuthGuard portal="candidate" />,
    children: [{
      element: <AuthLayout />,
      children: [
        { path: '/candidate/login',    element: <CandidateLogin /> },
        { path: '/candidate/register', element: <CandidateRegister /> },
      ],
    }],
  },

  // Candidate protected
  {
    element: <CandidateGuard />,
    children: [{
      element: <CandidateLayout />,
      children: [
        { path: '/candidate/profile',            element: <CandidateProfile /> },
        { path: '/candidate/resumes',            element: <ResumeList /> },
        { path: '/candidate/resumes/:resumeId',  element: <ResumeDetail /> },
        { path: '/candidate/jobs',               element: <JobBoard /> },
        { path: '/candidate/apply/:jobId',       element: <ApplyFlow /> },
        { path: '/candidate/applications',       element: <MyApplications /> },
      ],
    }],
  },
])

export default router
