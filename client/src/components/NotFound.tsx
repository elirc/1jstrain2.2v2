import { Link } from 'react-router-dom';

import { Page } from './ui';

export function NotFound({ what = 'That page does not exist.' }: { what?: string }) {
  return (
    <Page title="Not found" narrow>
      <div className="empty">
        <h1 className="empty-title">Not found</h1>
        <p>{what}</p>
        <Link className="btn" to="/">
          Back to the roadmap
        </Link>
      </div>
    </Page>
  );
}
