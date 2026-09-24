---
id: ADR-0006
title: Identify the learner with a header, not with authentication
status: accepted
date: 2026-09-23
amended-by: [J21]
superseded-by: null
---

# ADR-0006: Identify the learner with a header, not with authentication

Status: accepted, amended by journal entry J21 (the loopback bind is the precondition, written down) · Date 2026-09-23
Retro-documented from 6f1bf43
Anchors: `server/src/routes/api.js › requireProfile (L162–172 @ 6f1bf43)`, `client/src/lib/api.ts › getStoredProfileId (L35–54 @ 6f1bf43)`, `server/src/index.js › app.listen (L87–89 @ 6f1bf43)`

## Context
Stack Ready is a local, single-machine tool. Several people may share one install ("multiple learners on one install", README API table), but they share a keyboard, not a network. Passwords would protect the data from the only people who can already open the database file.

## Decision
We send the active profile's id in an `x-profile-id` header, remember it in `localStorage`, and check only that the profile exists. The profile is a "who is sitting here" switch, not an identity.

## Evidence
`server/src/routes/api.js › requireProfile (L167–172 @ 6f1bf43)`
```js
function requireProfile(req, store) {
  const id = req.get('x-profile-id');
  if (!id) throw httpError(400, 'profile_required', 'Send an x-profile-id header.');
  if (!store.getProfile(id)) throw httpError(404, 'not_found', 'No such profile.');
  return id;
}
```
`server/src/index.js › app.listen (L87 @ 6f1bf43)`
```js
const server = app.listen(config.port, () => {
```
The precondition that makes this safe, "only this machine can reach the port", is **not enforced**. Register M-04.

## Consequences
- Good: there are no sessions, cookies, CSRF tokens or password resets. The client adds one header in one place (`request()`).
- Cost: anyone who can reach the port can list profiles (`GET /api/profiles` needs no header), then read, reset or delete any of them. That is acceptable only if the port is private. `app.listen(port)` with no host binds every interface, so at the baseline the port is on the LAN (server B5, register M-04; `netstat` shows `0.0.0.0`). The decision was right. The bind broke its precondition.
- Cost: `DELETE /api/profiles/:id` has no guard, so the last profile can be deleted and the running app is left with none (server ST6, M-09).
- Cost: a stored id that no longer exists, for example after the JSON fallback swapped stores, reaches the client as a 404 on `/progress` before boot finishes. The client never clears that error (client B3, M-06).
- Forces on future work: every new route that touches learner data must call `requireProfile`. There is no middleware that does it for them.

## Alternatives rejected
- **Real authentication.** It adds cost with no threat to answer, as long as the bind is loopback.
- **A session cookie.** It gives the same trust as the header, plus CSRF to think about.

## Breaks first at
Learners per network. The first time the app is reachable by someone who is not at the keyboard (a LAN, a container with a published port, a deploy), the header is an open door. It is replaced by per-user authentication and profile ownership checks (E07).

## Revisit when
- `HOST` is set to anything other than `127.0.0.1`. J21 makes that the default, and the contract (§13) ships it.
- Anyone asks to "just put it on the server for the team".
- A DNS-rebinding concern becomes real. The Host allowlist is out of this release (contract, scope).
