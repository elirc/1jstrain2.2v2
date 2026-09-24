import { Component, useState, type ReactNode } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  Outlet,
  RouterProvider,
  useLocation,
  useParams,
  useRouteError,
  type RouteObject,
} from 'react-router-dom';

import { NotFound } from './components/NotFound';
import { Shell } from './components/Shell';
import { ErrorBanner, Loading, Page } from './components/ui';
import { AppProvider, useApp } from './lib/app-state';

import { Dashboard } from './pages/Dashboard';
import { DrillPage } from './pages/drill/DrillPage';
import { LabsPage } from './pages/LabsPage';
import { ModulePage } from './pages/ModulePage';
import { ProgressPage } from './pages/ProgressPage';
import { TracksPage } from './pages/TracksPage';

/**
 * The last-resort boundary, outside the router: it only ever catches an error
 * thrown by `AppProvider` itself. Render errors inside routes are caught by the
 * router's `errorElement`s below, which keep the shell on screen.
 */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="main narrow">
          <div className="stack">
            <ErrorBanner message={`Something broke while rendering: ${this.state.error.message}`} />
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function describeRouteError(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  if (error instanceof Error) return error.message;
  return 'That page could not be shown.';
}

/** A crash inside a page: shown inside the shell, so the nav and a way home survive. */
function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  return (
    <Page title="Something broke" narrow>
      <div className="stack">
        <ErrorBanner message={`Something broke on this page: ${describeRouteError(error)}`} />
        <div className="row">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>
          <Link className="btn btn-primary" to="/">
            Back to the roadmap
          </Link>
        </div>
      </div>
    </Page>
  );
}

/** Only reached when the shell itself fails to render. */
function RootError() {
  const error = useRouteError();
  return (
    <main className="main narrow">
      <title>Something broke · Stack Ready</title>
      <div className="stack">
        <ErrorBanner message={`Stack Ready could not start: ${describeRouteError(error)}`} />
        <div className="row">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="btn" href="/">
            Back to the roadmap
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * Holds every app route until the learner and the curriculum have loaded, and
 * then until the first progress snapshot exists. After that, reloads keep the
 * last snapshot on screen; this never blanks the page again.
 */
export function Gate() {
  const { bootStatus, bootError, retryBoot, profiles, profile, curriculum, progress, progressError, reloadProgress } =
    useApp();

  if (bootError) {
    return (
      <Page title="Cannot reach the API" narrow>
        <div className="stack">
          <ErrorBanner message={bootError} onRetry={retryBoot} />
          <p className="muted">
            Stack Ready needs its API. From the project root, <code>npm run dev</code> starts both halves; the API
            listens on <code>127.0.0.1:3001</code> unless <code>PORT</code> says otherwise.
          </p>
        </div>
      </Page>
    );
  }
  if (bootStatus !== 'ok' || !curriculum) {
    return (
      <Page title="Loading" narrow>
        <Loading what="Loading your curriculum" />
      </Page>
    );
  }
  if (profiles.length === 0) {
    return (
      <Page title="No learner" narrow>
        <div className="empty">
          <h1 className="empty-title">No learner yet</h1>
          <p>Add one with “New learner” at the top of the page.</p>
        </div>
      </Page>
    );
  }
  if (!profile || !progress) {
    if (progressError) {
      return (
        <Page title="Progress unavailable" narrow>
          <ErrorBanner
            message={`Could not load progress for ${profile?.name ?? 'this learner'}: ${progressError}`}
            onRetry={reloadProgress}
          />
        </Page>
      );
    }
    return (
      <Page title="Loading" narrow>
        <Loading what="Loading your progress" />
      </Page>
    );
  }
  return <Outlet />;
}

/** Keyed by module id: moving between modules starts on the primer, with fresh state. */
function ModuleRoute() {
  const { moduleId = '' } = useParams();
  return <ModulePage key={moduleId} moduleId={moduleId} />;
}

/**
 * Keyed by location: following any drill link — including one to the very
 * same URL — starts a fresh session instead of leaving the old one mounted.
 */
function DrillRoute() {
  const location = useLocation();
  return <DrillPage key={location.key} />;
}

export const routes: RouteObject[] = [
  {
    element: <Shell />,
    errorElement: <RootError />,
    children: [
      {
        element: <Gate />,
        errorElement: <RouteError />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/tracks', element: <TracksPage /> },
          { path: '/module/:moduleId', element: <ModuleRoute /> },
          { path: '/drill', element: <DrillRoute /> },
          { path: '/progress', element: <ProgressPage /> },
          { path: '/labs', element: <LabsPage /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export function App() {
  // Created on first render, not at import, so tests can import `routes` freely.
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <Boundary>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </Boundary>
  );
}
