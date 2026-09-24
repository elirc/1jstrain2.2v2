import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api, errorMessage, getStoredProfileId, isApiError, setStoredProfileId } from './api';
import type {
  Curriculum,
  ExportDocument,
  Flag,
  ImportResult,
  ModuleProgress,
  ModuleSummary,
  Profile,
  Progress,
  PublicQuestion,
  Settings,
  Stage,
  Track,
} from './types';
import { useResource, type ResourceStatus } from './useResource';

/**
 * App-wide state: which learner is active, the curriculum (static for the
 * life of the tab), and that learner's progress, settings and flags.
 *
 * Errors come in three classes and never mix (see journal J28):
 * 1. boot — profiles or curriculum failed: nothing can render, so the Gate
 *    shows a full-page error with Retry;
 * 2. page data — a `useResource` error shown in place of that page's content;
 * 3. background — a refresh or an action failed: the last good data stays on
 *    screen and one dismissible notice says what went wrong.
 *
 * Context is the right tool here because these values change rarely. Anything
 * that changed per keystroke would want a store with selectors instead.
 */

export interface AppState {
  profiles: Profile[];
  profile: Profile | null;
  curriculum: Curriculum | null;

  bootStatus: ResourceStatus;
  bootError: string | null;
  retryBoot: () => void;

  progress: Progress | null;
  progressStatus: ResourceStatus;
  progressError: string | null;
  reloadProgress: () => void;
  /** Coalesced: concurrent calls share one request plus at most one trailing one. */
  refreshProgress: () => Promise<Progress | null>;

  settings: Settings | null;
  settingsError: string | null;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;

  flags: Flag[] | null;
  flaggedIds: ReadonlySet<string>;
  setFlag: (
    question: Pick<PublicQuestion, 'id' | 'moduleId' | 'trackId' | 'prompt'>,
    flagged: boolean,
    note?: string,
  ) => Promise<void>;

  /** One background message at a time, shown in the shell's status region. */
  notice: string | null;
  notify: (message: string) => void;
  dismissNotice: () => void;

  moduleById: Map<string, ModuleSummary>;
  trackById: Map<string, Track>;
  stageById: Map<string, Stage>;

  /** Returns false when the learner chose to stay in a live drill. */
  selectProfile: (id: string) => boolean;
  createProfile: (name: string) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  importProfile: (doc: ExportDocument, name?: string) => Promise<ImportResult>;
  /** The last import's report. Kept here because switching to the new learner remounts the page that asked. */
  lastImport: ImportResult | null;
  clearLastImport: () => void;
  resetProgress: () => Promise<void>;

  /** The drill reports whether abandoning it now would lose answered questions. */
  setSessionInProgress: (inProgress: boolean) => void;
  /** Asks before discarding a live session; `true` when it is fine to leave. */
  confirmLeaveSession: () => boolean;
}

const AppContext = createContext<AppState | null>(null);

export const LEAVE_SESSION_PROMPT =
  'Leave this drill? The answers you gave are saved, but the rest of this session is dropped.';

interface Boot {
  profiles: Profile[];
  curriculum: Curriculum;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  // Null until boot has checked the stored id against the real profile list:
  // nothing per-profile is requested for an id that may no longer exist.
  const [profileId, setProfileId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const clearLastImport = useCallback(() => setLastImport(null), []);

  const boot = useResource<Boot>(['boot'], async (signal) => {
    const [loadedProfiles, curriculum] = await Promise.all([api.listProfiles(signal), api.curriculum(signal)]);
    return { profiles: loadedProfiles, curriculum };
  });

  const choose = useCallback((list: Profile[], preferred: string | null) => {
    const active = list.find((p) => p.id === preferred) ?? list[0] ?? null;
    setProfileId(active?.id ?? null);
    setStoredProfileId(active?.id ?? null);
  }, []);

  useEffect(() => {
    if (!boot.data) return;
    setProfiles(boot.data.profiles);
    choose(boot.data.profiles, getStoredProfileId());
  }, [boot.data, choose]);

  const { reload: reloadBoot } = boot;
  const currentProfileId = useRef<string | null>(null);
  currentProfileId.current = profileId;

  // Each snapshot carries the id it belongs to, so a switch shows "loading",
  // never the previous learner's numbers under the new learner's name.
  const progressRes = useResource<{ profileId: string; progress: Progress }>(
    profileId ? ['progress', profileId] : null,
    async (signal) => ({
      profileId: profileId as string,
      progress: await api.progress(profileId as string, signal),
    }),
  );

  // A 404 on progress means the profile is gone (another tab deleted it, the
  // data dir was wiped): forget it and fall back, never a dead end.
  useEffect(() => {
    if (!isApiError(progressRes.error, 'not_found') || !profileId) return;
    const remaining = profiles.filter((p) => p.id !== profileId);
    setProfiles(remaining);
    choose(remaining, null);
    if (remaining.length === 0) reloadBoot();
  }, [progressRes.error, profileId, profiles, choose, reloadBoot]);

  const settingsRes = useResource<Settings>(profileId ? ['settings', profileId] : null, (signal) =>
    api.settings(profileId as string, signal),
  );

  const flagsRes = useResource<Flag[]>(profileId ? ['flags', profileId] : null, (signal) =>
    api.flags(profileId as string, signal),
  );

  const notify = useCallback((message: string) => setNotice(message), []);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const inflight = useRef<{
    profileId: string;
    promise: Promise<Progress | null>;
    trailing: Promise<Progress | null> | null;
  } | null>(null);
  const { setData: setProgressData } = progressRes;

  const refreshProgress = useCallback((): Promise<Progress | null> => {
    const run = (id: string): Promise<Progress | null> => {
      const entry = {
        profileId: id,
        trailing: null as Promise<Progress | null> | null,
        promise: api
          .progress(id)
          .then(
            (next) => {
              // Identity check: a response for a learner we have since left must not land.
              if (currentProfileId.current !== id) return null;
              setProgressData({ profileId: id, progress: next });
              return next;
            },
            (err: unknown) => {
              if (currentProfileId.current === id) {
                setNotice(`Could not refresh your progress: ${errorMessage(err)}`);
              }
              return null;
            },
          )
          .finally(() => {
            if (inflight.current === entry) inflight.current = null;
          }),
      };
      inflight.current = entry;
      return entry.promise;
    };

    const id = currentProfileId.current;
    if (!id) return Promise.resolve(null);
    const current = inflight.current;
    if (current && current.profileId === id) {
      // One request is running; anything recorded since it started needs one more.
      current.trailing ??= current.promise.then(() => run(id));
      return current.trailing;
    }
    return run(id);
  }, [setProgressData]);

  const sessionInProgress = useRef(false);
  const setSessionInProgress = useCallback((value: boolean) => {
    sessionInProgress.current = value;
  }, []);
  const confirmLeaveSession = useCallback(() => {
    if (!sessionInProgress.current) return true;
    const ok = window.confirm(LEAVE_SESSION_PROMPT);
    if (ok) sessionInProgress.current = false;
    return ok;
  }, []);

  const selectProfile = useCallback(
    (id: string) => {
      if (id === currentProfileId.current) return true;
      if (!confirmLeaveSession()) return false;
      setProfileId(id);
      setStoredProfileId(id);
      setNotice(null);
      return true;
    },
    [confirmLeaveSession],
  );

  const createProfile = useCallback(async (name: string) => {
    const created = await api.createProfile(name);
    setProfiles((prev) => [...prev, created]);
    setProfileId(created.id);
    setStoredProfileId(created.id);
    return created;
  }, []);

  const deleteProfile = useCallback(
    async (id: string) => {
      await api.deleteProfile(id);
      const remaining = profiles.filter((p) => p.id !== id);
      setProfiles(remaining);
      if (id === currentProfileId.current) choose(remaining, null);
    },
    [profiles, choose],
  );

  const importProfile = useCallback(async (doc: ExportDocument, name?: string) => {
    const result = await api.importProfile(doc, name);
    setProfiles((prev) => [...prev, result.profile]);
    setProfileId(result.profile.id);
    setStoredProfileId(result.profile.id);
    setLastImport(result);
    return result;
  }, []);

  const { reload: reloadFlags } = flagsRes;
  const resetProgress = useCallback(async () => {
    const id = currentProfileId.current;
    if (!id) return;
    await api.resetProgress(id);
    await refreshProgress();
    reloadFlags();
  }, [refreshProgress, reloadFlags]);

  const { setData: setSettingsData } = settingsRes;
  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const id = currentProfileId.current;
      if (!id) throw new Error('No learner is selected.');
      const next = await api.updateSettings(id, patch);
      if (currentProfileId.current === id) setSettingsData(next);
      return next;
    },
    [setSettingsData],
  );

  const { setData: setFlagsData } = flagsRes;
  const setFlag = useCallback<AppState['setFlag']>(
    async (question, flagged, note) => {
      const id = currentProfileId.current;
      if (!id) return;
      if (flagged) {
        const saved = await api.flag(question.id, id, note);
        if (currentProfileId.current !== id) return;
        setFlagsData((prev) => [
          {
            questionId: question.id,
            moduleId: question.moduleId,
            trackId: question.trackId,
            prompt: question.prompt,
            note: saved?.note ?? note ?? '',
            createdAt: saved?.createdAt ?? new Date().toISOString(),
          },
          ...(prev ?? []).filter((f) => f.questionId !== question.id),
        ]);
      } else {
        await api.unflag(question.id, id);
        if (currentProfileId.current !== id) return;
        setFlagsData((prev) => (prev ?? []).filter((f) => f.questionId !== question.id));
      }
    },
    [setFlagsData],
  );

  const curriculum = boot.data?.curriculum ?? null;

  const profile = useMemo(() => profiles.find((p) => p.id === profileId) ?? null, [profiles, profileId]);
  const moduleById = useMemo(() => new Map((curriculum?.modules ?? []).map((m) => [m.id, m])), [curriculum]);
  const trackById = useMemo(() => new Map((curriculum?.tracks ?? []).map((t) => [t.id, t])), [curriculum]);
  const stageById = useMemo(() => new Map((curriculum?.stages ?? []).map((s) => [s.id, s])), [curriculum]);
  const flaggedIds = useMemo(() => new Set((flagsRes.data ?? []).map((f) => f.questionId)), [flagsRes.data]);

  // The progress error only matters to the Gate while there is nothing to show;
  // once a snapshot exists, a failed reload is a background notice instead.
  const progressError =
    progressRes.error && !isApiError(progressRes.error, 'not_found') ? errorMessage(progressRes.error) : null;
  const progress = profileId && progressRes.data?.profileId === profileId ? progressRes.data.progress : null;
  const hasProgress = progress !== null;
  useEffect(() => {
    if (progressError && hasProgress) setNotice(`Could not refresh your progress: ${progressError}`);
  }, [progressError, hasProgress]);

  const value = useMemo<AppState>(
    () => ({
      profiles,
      profile,
      curriculum,
      bootStatus: boot.status,
      bootError: boot.error ? errorMessage(boot.error) : null,
      retryBoot: boot.reload,
      progress,
      progressStatus: progressRes.status,
      progressError,
      reloadProgress: progressRes.reload,
      refreshProgress,
      settings: settingsRes.data,
      settingsError: settingsRes.error ? errorMessage(settingsRes.error) : null,
      updateSettings,
      flags: flagsRes.data,
      flaggedIds,
      setFlag,
      notice,
      notify,
      dismissNotice,
      moduleById,
      trackById,
      stageById,
      selectProfile,
      createProfile,
      deleteProfile,
      importProfile,
      lastImport,
      clearLastImport,
      resetProgress,
      setSessionInProgress,
      confirmLeaveSession,
    }),
    [
      profiles,
      profile,
      curriculum,
      boot.status,
      boot.error,
      boot.reload,
      progress,
      progressRes.status,
      progressError,
      progressRes.reload,
      refreshProgress,
      settingsRes.data,
      settingsRes.error,
      updateSettings,
      flagsRes.data,
      flaggedIds,
      setFlag,
      notice,
      notify,
      dismissNotice,
      moduleById,
      trackById,
      stageById,
      selectProfile,
      createProfile,
      deleteProfile,
      importProfile,
      lastImport,
      clearLastImport,
      resetProgress,
      setSessionInProgress,
      confirmLeaveSession,
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

/**
 * Progress for one module, or `null` while progress is unknown. A module the
 * learner has not started still has a record (the server lists every module),
 * so `null` means "not loaded", never "zero" — the call site shows a
 * placeholder rather than a false "0 of N mastered".
 */
export function useModuleProgress(moduleId: string): ModuleProgress | null {
  const { progress } = useApp();
  if (!progress) return null;
  return progress.modules.find((m) => m.moduleId === moduleId) ?? null;
}

/**
 * The stage a stage's gate is measured against: the one named by `after`,
 * else the previous stage in list order. `null` for the first stage.
 */
export function gateStage(stages: Stage[], stage: Stage): Stage | null {
  if (stage.after) return stages.find((s) => s.id === stage.after) ?? null;
  const index = stages.findIndex((s) => s.id === stage.id);
  return index > 0 ? stages[index - 1] : null;
}
