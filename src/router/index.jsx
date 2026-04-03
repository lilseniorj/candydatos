import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'

// Layouts (kept static — they wrap every page)
import AuthLayout      from '../layouts/AuthLayout'
import CompanyLayout   from '../layouts/CompanyLayout'
import CandidateLayout from '../layouts/CandidateLayout'

// Guards (kept static — they run on every navigation)
import CompanyGuard   from './guards/CompanyGuard'
import CandidateGuard from './guards/CandidateGuard'
import AuthGuard      from './guards/AuthGuard'

// ── Suspense fallback ───────────────────────────────────────────────────────
const Fallback = (
  <div className="flex items-center justify-center py-24">
    <Spinner size="lg" />
  </div>
)
function L({ Component }) {
  return <Suspense fallback={Fallback}><Component /></Suspense>
}

// ── Lazy-loaded pages ───────────────────────────────────────────────────────
// Public
const LandingPage = lazy(() => import('../pages/public/LandingPage'))
const JobPreview  = lazy(() => import('../pages/public/JobPreview'))
const SeedPage    = lazy(() => import('../pages/SeedPage'))

// Auth pages
const CompanyLogin      = lazy(() => import('../pages/auth/CompanyLogin'))
const CompanyRegister   = lazy(() => import('../pages/auth/CompanyRegister'))
const CandidateLogin    = lazy(() => import('../pages/auth/CandidateLogin'))
const CandidateRegister = lazy(() => import('../pages/auth/CandidateRegister'))
const UnifiedLogin      = lazy(() => import('../pages/auth/UnifiedLogin'))
const PortalChooser     = lazy(() => import('../pages/auth/PortalChooser'))

// Company pages
const CompanySetup     = lazy(() => import('../pages/company/CompanySetup'))
const CompanyDashboard = lazy(() => import('../pages/company/CompanyDashboard'))
const JobList          = lazy(() => import('../pages/company/JobList'))
const ApplicantList    = lazy(() => import('../pages/company/ApplicantList'))
const Analytics        = lazy(() => import('../pages/company/Analytics'))
const TestManager      = lazy(() => import('../pages/company/TestManager'))
const CompanySettings  = lazy(() => import('../pages/company/CompanySettings'))
const JobEdit          = lazy(() => import('../pages/company/JobEdit'))
const ApplicantDetail  = lazy(() => import('../pages/company/ApplicantDetail'))
const SkillsMatching   = lazy(() => import('../pages/company/SkillsMatching'))

// Candidate pages
const CandidateProfile = lazy(() => import('../pages/candidate/CandidateProfile'))
const ResumeList       = lazy(() => import('../pages/candidate/ResumeList'))
const ResumeDetail     = lazy(() => import('../pages/candidate/ResumeDetail'))
const JobBoard         = lazy(() => import('../pages/candidate/JobBoard'))
const ApplyFlow        = lazy(() => import('../pages/candidate/ApplyFlow'))
const MyApplications     = lazy(() => import('../pages/candidate/MyApplications'))
const CandidateSettings  = lazy(() => import('../pages/candidate/CandidateSettings'))

// ── Router ──────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Landing
  { path: '/', element: <L Component={LandingPage} /> },
  { path: '/jobs/:jobId', element: <L Component={JobPreview} /> },

  // Unified login
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <L Component={UnifiedLogin} /> },
      { path: '/choose-portal', element: <L Component={PortalChooser} /> },
    ],
  },

  // Seed (temporary — remove after use)
  { path: '/seed', element: <L Component={SeedPage} /> },

  // Company auth
  {
    element: <AuthGuard portal="company" />,
    children: [{
      element: <AuthLayout />,
      children: [
        { path: '/company/login',    element: <L Component={CompanyLogin} /> },
        { path: '/company/register', element: <L Component={CompanyRegister} /> },
      ],
    }],
  },

  // Company setup (no layout guard — needs special check)
  {
    path: '/company/setup',
    element: <L Component={CompanySetup} />,
  },

  // Company protected
  {
    element: <CompanyGuard />,
    children: [{
      element: <CompanyLayout />,
      children: [
        { path: '/company/dashboard',                          element: <L Component={CompanyDashboard} /> },
        { path: '/company/jobs',                               element: <L Component={JobList} /> },
        { path: '/company/jobs/new',                           element: <L Component={JobEdit} /> },
        { path: '/company/jobs/:jobId/edit',                   element: <L Component={JobEdit} /> },
        { path: '/company/jobs/:jobId/applicants',             element: <L Component={ApplicantList} /> },
        { path: '/company/jobs/:jobId/applicants/:appId',      element: <L Component={ApplicantDetail} /> },
        { path: '/company/tests',                              element: <L Component={TestManager} /> },
        { path: '/company/analytics',                          element: <L Component={Analytics} /> },
        { path: '/company/skills',                             element: <L Component={SkillsMatching} /> },
        { path: '/company/settings',                           element: <L Component={CompanySettings} /> },
      ],
    }],
  },

  // Candidate auth
  {
    element: <AuthGuard portal="candidate" />,
    children: [{
      element: <AuthLayout />,
      children: [
        { path: '/candidate/login',    element: <L Component={CandidateLogin} /> },
        { path: '/candidate/register', element: <L Component={CandidateRegister} /> },
      ],
    }],
  },

  // Candidate protected
  {
    element: <CandidateGuard />,
    children: [{
      element: <CandidateLayout />,
      children: [
        { path: '/candidate/profile',            element: <L Component={CandidateProfile} /> },
        { path: '/candidate/resumes',            element: <L Component={ResumeList} /> },
        { path: '/candidate/resumes/:resumeId',  element: <L Component={ResumeDetail} /> },
        { path: '/candidate/jobs',               element: <L Component={JobBoard} /> },
        { path: '/candidate/apply/:jobId',       element: <L Component={ApplyFlow} /> },
        { path: '/candidate/applications',       element: <L Component={MyApplications} /> },
        { path: '/candidate/settings',           element: <L Component={CandidateSettings} /> },
      ],
    }],
  },
])

export default router
