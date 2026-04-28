import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider } from '@/lib/WorkspaceContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Campaigns from './pages/Campaigns';
import EmailLog from './pages/EmailLog';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import EmailIngestion from './pages/EmailIngestion';
import ReviewQueue from './pages/ReviewQueue';
import OAuthCallback from './pages/OAuthCallback';
import Templates from './pages/Templates';
import SeoScore from './pages/SeoScore';

// Routes that MUST stay public — no auth prompt on visit.
const PUBLIC_PATHS = ["/"];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      // Never block the public homepage — user_not_registered still lands on marketing.
      if (isPublicPath) {
        return (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        );
      }
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Public homepage must render without auth. Only redirect for protected routes.
      if (isPublicPath) {
        return (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        );
      }
      navigateToLogin();
      return null;
    }
  }

  // Public-first routing:
  //   "/"      -> Marketing homepage (public for everyone, even authed users)
  //   "/app"   -> Internal dashboard (auth required)
  //   /leads, /campaigns, /emails, /settings, ... -> app routes (auth required)
  //
  // Authenticated users enter the app explicitly via a CTA on the landing page.
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Auth-gated app routes */}
      <Route path="/onboarding" element={
        isAuthenticated
          ? <Onboarding />
          : <RequireAuthRedirect />
      } />
      <Route element={isAuthenticated ? <Layout /> : <RequireAuthRedirect />}>
        <Route path="/app" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="/leads" element={<ErrorBoundary><Leads /></ErrorBoundary>} />
        <Route path="/leads/:id" element={<ErrorBoundary><LeadDetail /></ErrorBoundary>} />
        <Route path="/campaigns" element={<ErrorBoundary><Campaigns /></ErrorBoundary>} />
        <Route path="/emails" element={<ErrorBoundary><EmailLog /></ErrorBoundary>} />
        <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        <Route path="/email-ingestion" element={<ErrorBoundary><EmailIngestion /></ErrorBoundary>} />
        <Route path="/review-queue" element={<ErrorBoundary><ReviewQueue /></ErrorBoundary>} />
        <Route path="/templates" element={<ErrorBoundary><Templates /></ErrorBoundary>} />
        <Route path="/seo-score" element={<ErrorBoundary><SeoScore /></ErrorBoundary>} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// For unauthenticated users hitting any in-app route directly — bounce to login,
// then return them to that same route after auth.
const RequireAuthRedirect = () => {
  const { navigateToLogin } = useAuth();
  navigateToLogin();
  return null;
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="*" element={
              <WorkspaceProvider>
                <AuthenticatedApp />
              </WorkspaceProvider>
            } />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App