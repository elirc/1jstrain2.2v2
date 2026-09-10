import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, getStoredProfileId, setStoredProfileId } from './api';
import type { Curriculum, ModuleSummary, Profile, Progress, Track } from './types';

/**
 * App-wide state: which learner is signed in, the curriculum (static for the
 * life of the session) and their progress (refreshed after every drill).
 *
 * Context is the right tool here because these values change rarely — the
 * curriculum never, the profile on an explicit switch, progress once per
 * session. Anything that changed per keystroke would want a store with
 * selectors instead.
 */

interface AppState {
  profiles: Profile[];
  profile: Profile | null;
  curriculum: Curriculum | null;
  progress: Progress | null;
  loading: boolean;
  error: string | null;
  moduleById: Map<string, ModuleSummary>;
  trackById: Map<string, Track>;
  selectProfile: (id: string) => void;
  createProfile: (name: string) => Promise<void>;
  refreshProgress: () => Promise<void>;
  resetProgress: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(getStoredProfileId());
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load. Cancellation guards against the double-invoke of StrictMode
  // and against a profile switch landing mid-flight.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [loadedProfiles, loadedCurriculum] = await Promise.all([
          api.listProfiles(),
          api.curriculum(),
        ]);
        if (cancelled) return;

        setProfiles(loadedProfiles);
        setCurriculum(loadedCurriculum);

        const stored = getStoredProfileId();
        const active = loadedProfiles.find((p) => p.id === stored) ?? loadedProfiles[0] ?? null;
        setProfileId(active?.id ?? null);
        setStoredProfileId(active?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not reach the API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProgress = useCallback(async () => {
    if (!profileId) return;
    try {
      setProgress(await api.progress(profileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load progress.');
    }
  }, [profileId]);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setProgress(null);
      return;
    }
    api
      .progress(profileId)
      .then((next) => {
        if (!cancelled) setProgress(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load progress.');
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const selectProfile = useCallback((id: string) => {
    setProfileId(id);
    setStoredProfileId(id);
    setProgress(null);
  }, []);

  const createProfile = useCallback(async (name: string) => {
    const created = await api.createProfile(name);
    setProfiles((prev) => [...prev, created]);
    setProfileId(created.id);
    setStoredProfileId(created.id);
    setProgress(null);
  }, []);

  const resetProgress = useCallback(async () => {
    if (!profileId) return;
    await api.resetProgress(profileId);
    setProgress(await api.progress(profileId));
  }, [profileId]);

  const profile = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

  const moduleById = useMemo(
    () => new Map((curriculum?.modules ?? []).map((m) => [m.id, m])),
    [curriculum],
  );

  const trackById = useMemo(
    () => new Map((curriculum?.tracks ?? []).map((t) => [t.id, t])),
    [curriculum],
  );

  // Memoised so consumers do not re-render on every provider render — context
  // has no selectors, so the value's identity is the only thing gating them.
  const value = useMemo<AppState>(
    () => ({
      profiles,
      profile,
      curriculum,
      progress,
      loading,
      error,
      moduleById,
      trackById,
      selectProfile,
      createProfile,
      refreshProgress,
      resetProgress,
    }),
    [
      profiles,
      profile,
      curriculum,
      progress,
      loading,
      error,
      moduleById,
      trackById,
      selectProfile,
      createProfile,
      refreshProgress,
      resetProgress,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Throws outside the provider rather than handing back a confusing null. */
export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside <AppProvider>');
  return context;
}

/** Progress for one module, or a zeroed record if it has not been started. */
export function useModuleProgress(moduleId: string) {
  const { progress } = useApp();
  return (
    progress?.modules.find((m) => m.moduleId === moduleId) ?? {
      moduleId,
      trackId: 'js' as const,
      total: 0,
      seen: 0,
      mastered: 0,
      due: 0,
      attempts: 0,
      accuracy: null,
      mastery: 0,
    }
  );
}
