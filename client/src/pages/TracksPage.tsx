import { Link } from 'react-router-dom';

import { Inline } from '../components/Markdown';
import { Bar, Ring, TrackDot, percent } from '../components/ui';
import { useApp } from '../lib/app-state';

/** Subject-first view, for when you want to grind one technology rather than follow the path. */
export function TracksPage() {
  const { curriculum, progress } = useApp();
  if (!curriculum || !progress) return null;

  return (
    <main className="main">
      <div className="page-head">
        <h1>Tracks</h1>
        <p>
          The same {curriculum.totals.questions} questions grouped by technology. Useful when an
          interview is next week and it is a .NET shop.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {curriculum.tracks.map((track) => {
          const stats = progress.tracks.find((t) => t.trackId === track.id);
          const modules = curriculum.modules.filter((m) => m.trackId === track.id);

          return (
            <section key={track.id} className="card card-hover">
              <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <Ring value={stats?.mastery ?? 0} size={54} stroke={5} color={track.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 7 }}>
                    <TrackDot color={track.color} />
                    <h2 style={{ fontSize: 16 }}>{track.title}</h2>
                  </div>
                  <p className="muted" style={{ margin: '3px 0 0', fontSize: 13 }}>
                    {track.blurb}
                  </p>
                </div>
              </div>

              <div className="row faint" style={{ fontSize: 12, margin: '12px 0 10px', gap: 10 }}>
                <span>{stats?.total ?? 0} questions</span>
                <span>·</span>
                <span>{modules.length} modules</span>
                <span>·</span>
                <span>{percent(stats?.accuracy)} accuracy</span>
              </div>

              <div className="stack" style={{ gap: 8 }}>
                {modules.map((module) => {
                  const mp = progress.modules.find((m) => m.moduleId === module.id);
                  return (
                    <Link
                      key={module.id}
                      to={`/module/${module.id}`}
                      style={{ display: 'block' }}
                      title={module.blurb}
                    >
                      <div className="spread" style={{ fontSize: 13, marginBottom: 3 }}>
                        <span>
                          <Inline text={module.title} />
                        </span>
                        <span className="faint" style={{ fontSize: 11.5 }}>
                          {mp?.mastered ?? 0}/{module.questionCount}
                        </span>
                      </div>
                      <Bar
                        value={mp && mp.total ? mp.mastered / mp.total : 0}
                        color={track.color}
                      />
                    </Link>
                  );
                })}
              </div>

              <Link
                className="btn btn-sm"
                to={`/drill?mode=track&trackId=${track.id}`}
                style={{ marginTop: 14, width: '100%' }}
              >
                Drill {track.title}
              </Link>
            </section>
          );
        })}
      </div>
    </main>
  );
}
