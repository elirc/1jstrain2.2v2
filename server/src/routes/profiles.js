import { Router } from 'express';

import { httpError } from '../errors.js';
import { buildExport, exportFilename, parseImport } from '../transfer.js';
import { obj, str } from '../validate.js';

/**
 * Learners on this install: list, create, delete, export and import.
 *
 * Export is scoped by the path, not the x-profile-id header, so that a plain
 * `<a href download>` can fetch it.
 */
export function createProfileRouter({ store, now }) {
  const router = Router();

  router.get('/profiles', (req, res) => {
    res.json({ data: store.listProfiles() });
  });

  router.post('/profiles', (req, res) => {
    const name = str(obj(req.body).name, 'name', { max: 40 });
    res.status(201).json({ data: store.createProfile(name, now()) });
  });

  // The body parser for this route (10 MB) is mounted in app.js, ahead of the
  // global 64 kB one; see the comment there.
  router.post('/profiles/import', (req, res) => {
    const { snapshot, skipped } = parseImport(req.body);
    const profile = store.importProfile(snapshot, now());
    res.status(201).json({
      data: {
        profile,
        imported: {
          cardStates: snapshot.cardStates.length,
          attempts: snapshot.attempts.length,
          flags: snapshot.flags.length,
        },
        skipped,
      },
    });
  });

  router.get('/profiles/:id/export', (req, res) => {
    const profile = store.getProfile(req.params.id);
    if (!profile) throw httpError(404, 'not_found', 'No such profile.');
    res.set('Content-Disposition', `attachment; filename="${exportFilename(profile.name)}"`);
    res.json(buildExport(store, profile, now()));
  });

  router.delete('/profiles/:id', (req, res) => {
    if (!store.getProfile(req.params.id)) throw httpError(404, 'not_found', 'No such profile.');
    // Without a profile the client has nothing to send as x-profile-id, and
    // the default one is only created at boot.
    if (store.listProfiles().length <= 1) {
      throw httpError(409, 'last_profile', 'This is the only profile. Create another one before deleting it.');
    }
    store.deleteProfile(req.params.id);
    res.status(204).end();
  });

  return router;
}
