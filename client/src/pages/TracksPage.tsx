import { Link } from 'react-router-dom';

import { Inline } from '../components/Markdown';
import { Bar, Page, Ring, TrackDot, percent } from '../components/ui';
import { useApp } from '../lib/app-state';
import { drillHref } from './drill/params';

/** Subject-first view, for when you want to grind one technology rather than follow the path. */
export function TracksPage() {
  const { curriculum, progress } = useApp();
  if (!curriculum || !progress) return null; // the Gate guarantees both

  return (
    <Page title="Tracks">
      <div className="page-head">
        <h1>Tracks</h1>
        <p>
          The same {curriculum.totals.questions} questions grouped by technology. Useful when an interview is next week
          and it is a .NET shop.
        </p>
      </div>

      <div className="grid grid-cards">
        {curriculum.tracks.map((track) => {
          const stats = progress.tracks.find((t) => t.trackId === track.id);
          const modules = curriculum.modules.filter((m) => m.trackId === track.id);

          return (
            <section key={track.id} className="card track-card" aria-labelledby={`track-${track.id}`}>
              <div className="row track-card-head">
                <Ring
                  value={stats?.mastery ?? 0}
                  size={54}
                  stroke={5}
                  color={track.color}
                  ariaLabel={`${track.title}: ${percent(stats?.mastery ?? 0)} mastered`}
                />
                <div className="grow">
                  <div className="row tight">
                    <TrackDot color={track.color} />
                    <h2 id={`track-${track.id}`} className="card-title">
                      {track.title}
                    </h2>
                  </div>
                  <p className="muted small flush">{track.blurb}</p>
                </div>
              </div>

              <div className="row meta track-card-stats">
                <span>{stats?.total ?? 0} questions</span>
                <span aria-hidden="true">·</span>
                <span>{modules.length} modules</span>
                <span aria-hidden="true">·</span>
                <span>{percent(stats?.accuracy)} accuracy</span>
              </div>

              <ul className="stack stack-tight plain-list">
                {modules.map((module) => {
                  const mp = progress.modules.find((m) => m.moduleId === module.id);
                  return (
                    <li key={module.id}>
                      <Link
                        className="track-module"
                        to={`/module/${encodeURIComponent(module.id)}`}
                        title={module.blurb}
                      >
                        <span className="spread">
                          <span>
                            <Inline text={module.title} />
                          </span>
                          <span className="meta">
                            {mp?.mastered ?? 0}/{module.questionCount}
                          </span>
                        </span>
                        <Bar value={mp && mp.total ? mp.mastered / mp.total : 0} color={track.color} />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <Link className="btn btn-sm btn-block" to={drillHref({ mode: 'track', trackId: track.id })}>
                Drill {track.title}
              </Link>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
