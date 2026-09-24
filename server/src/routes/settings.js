import { Router } from 'express';

import { parseSettingsPatch, withDefaults } from '../settings.js';
import { obj } from '../validate.js';

/** Per-profile settings. PATCH takes any subset and answers with the full set. */
export function createSettingsRouter({ store, requireProfile }) {
  const router = Router();

  router.get('/settings', (req, res) => {
    const profileId = requireProfile(req);
    res.json({ data: withDefaults(store.getSettings(profileId)) });
  });

  router.patch('/settings', (req, res) => {
    const profileId = requireProfile(req);
    const patch = parseSettingsPatch(obj(req.body));
    const next = { ...withDefaults(store.getSettings(profileId)), ...patch };
    store.saveSettings(profileId, next);
    res.json({ data: next });
  });

  return router;
}
