import type { Curriculum, Progress } from './types';

/**
 * What changed between two progress snapshots that is worth saying out loud:
 * a level-up, a module fully mastered, a stage opening. Pure, so the drill can
 * call it with the snapshot from before an answer and the one after.
 */
export function diffMilestones(
  before: Progress | null,
  after: Progress | null,
  curriculum: Pick<Curriculum, 'modules' | 'stages'> | null,
): string[] {
  if (!before || !after) return [];
  const out: string[] = [];

  if (after.level.level > before.level.level) {
    out.push(`Level up: ${after.level.title}`);
  }

  const beforeModules = new Map(before.modules.map((m) => [m.moduleId, m]));
  for (const m of after.modules) {
    const prev = beforeModules.get(m.moduleId);
    if (m.total > 0 && m.mastered === m.total && (!prev || prev.mastered < prev.total)) {
      const title = curriculum?.modules.find((x) => x.id === m.moduleId)?.title ?? m.moduleId;
      out.push(`Module mastered: ${title}`);
    }
  }

  const beforeStages = new Map(before.stages.map((s) => [s.stageId, s]));
  for (const s of after.stages) {
    if (s.unlocked && beforeStages.get(s.stageId)?.unlocked === false) {
      const title = curriculum?.stages.find((x) => x.id === s.stageId)?.title ?? s.stageId;
      out.push(`Stage unlocked: ${title}`);
    }
  }

  return out;
}
