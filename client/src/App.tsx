import { Component, type ReactNode } from 'react';
import { createBrowserRouter, Link, RouterProvider, useRouteError } from 'react-router-dom';

import { Shell } from './components/Shell';
import { ErrorBanner, Loading } from './components/ui';
import { AppProvider, useApp } from './lib/app-state';

import { Dashboard } from './pages/Dashboard';
import { DrillPage } from './pages/DrillPage';
import { LabsPage } from './pages/LabsPage';
import { ModulePage } from './pages/ModulePage';
import { ProgressPage } from './pages/ProgressPage';
import { TracksPage } from './pages/TracksPage';

/**
 * An error boundary catches errors thrown while *rendering* its subtree — not
 * ones in event handlers or async callbacks, which is why the API client
 * surfaces those through state instead.
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

function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'That page could not be loaded.';
  return (
    <main className="main narrow">
      <ErrorBanner message={message} />
    </main>
  );
}

/** Holds every route until the profile and curriculum have loaded. */
function Gate({ children }: { children: ReactNode }) {
  const { loading, error, profile, curriculum } = useApp();

  if (loading) return <main className="main">{<Loading what="Loading your curriculum" />}</main>;
  if (error) {
    return (
      <main className="main narrow">
        <div className="stack">
          <ErrorBanner message={error} />
          <p className="muted">
            The API should be running on port 3001. Start both halves with <code>npm run dev</code>{' '}
            from the project root.
          </p>
        </div>
      </main>
    );
  }
  if (!profile || !curriculum) {
    return (
      <main className="main narrow">
        <ErrorBanner message="No learner profile is available. Create one from the menu above." />
      </main>
    );
  }
  return <>{children}</>;
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Gate><Dashboard /></Gate> },
      { path: '/tracks', element: <Gate><TracksPage /></Gate> },
      { path: '/module/:moduleId', element: <Gate><ModulePage /></Gate> },
      { path: '/drill', element: <Gate><DrillPage /></Gate> },
      { path: '/progress', element: <Gate><ProgressPage /></Gate> },
      { path: '/labs', element: <Gate><LabsPage /></Gate> },
      {
        path: '*',
        element: (
          <main className="main narrow">
            <div className="empty">
              <h1>Not found</h1>
              <p>That page does not exist.</p>
              <Link className="btn" to="/">
                Back to the roadmap
              </Link>
            </div>
          </main>
        ),
      },
    ],
  },
]);

export function App() {
  return (
    <Boundary>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </Boundary>
  );
}
