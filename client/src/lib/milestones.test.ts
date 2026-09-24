import { describe, expect, it } from 'vitest';

import { curriculum, makeProgress } from '../test/fixtures';
import { diffMilestones } from './milestones';

describe('diffMilestones', () => {
  it('announces a level-up, a mastered module and an unlocked stage', () => {
    const before = makeProgress();
    const after = makeProgress({
      level: { ...before.level, level: 2, title: 'Junior' },
      modules: before.modules.map((m) => (m.moduleId === 'js-values' ? { ...m, mastered: 2 } : m)),
      stages: before.stages.map((s) => ({ ...s, unlocked: true })),
    });
    expect(diffMilestones(before, after, curriculum)).toEqual([
      'Level up: Junior',
      'Module mastered: Values',
      'Stage unlocked: Stage two',
    ]);
  });

  it('says nothing when nothing crossed a line, or when a snapshot is missing', () => {
    const p = makeProgress();
    expect(diffMilestones(p, p, curriculum)).toEqual([]);
    expect(diffMilestones(null, p, curriculum)).toEqual([]);
  });
});
