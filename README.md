# Atlas

Travel discovery app: 260 hand-curated destinations fused with **live
OpenStreetMap places** for any point on Earth. Next.js 15 (App Router,
Turbopack dev), Tailwind, Firebase optional, PWA/service worker via Serwist.

## Architecture in one paragraph

The bundled dataset (`src/data/`) is deliberately small. Discovery never
depends on it alone: `src/app/components/Discover.tsx` (home) and
`LiveResults.tsx` (Explore) both call `/api/places/nearby`, which queries
Overpass (OpenStreetMap) for real POIs — museums in Hamilton, beaches in
Miami, whatever — sorted by distance and deduped against curated cards.
The chosen location (detected / preset / searched city) is persisted to
localStorage (`src/lib/location.ts`) and restored on every page, so nobody
has to re-detect their location after a reload.

## Deployment — push to main, that's it

**Production: https://atlas-gamma-ashen.vercel.app**

- The repo is connected to Vercel via the **GitHub integration** (set up in
  an earlier session; the Vercel account is `rishinair-code`'s, project
  `atlas`, scope `rishinair-codes-projects`).
- Every push to `main` auto-builds and promotes to Production (~25 s build).
  No Vercel CLI login exists on this machine and none is needed.
- Per-build URLs (`atlas-<hash>-….vercel.app`) are SSO-gated by Vercel
  Deployment Protection; the production alias above is public.
- Deployment history / instant rollback: Vercel dashboard → project `atlas`
  → Deployments. Programmatic check:
  `gh api repos/rishinair-code/atlas/deployments?per_page=3`.

## Environment variables

`.env.local` (gitignored) holds `NEXT_PUBLIC_FIREBASE_*` values. They are
currently placeholders — the app detects this and falls back to localStorage
guest mode (`src/lib/store.ts`), so the site works fully without Firebase.
`OPEN_METEO_API_KEY` is optional: without it, climate normals come from the
free ERA5 archive fallback in `src/lib/weather.ts`.

## Local development

```bash
npm install        # or npm ci
npm run dev        # http://localhost:3000
```

Gotchas learned the hard way (also in the Freebuff run doc):

- **Never run `npm run build` while a dev server is up** — it rewrites
  `.next` and the running server starts returning 500s.
- Typecheck with `npx tsc --noEmit`; the production build prerenders all
  260 place pages.
- The nearby-POI route races two Overpass endpoints in parallel
  (Kumi mirror + main) with a 40 s timeout; if discovery feels slow, the
  upstreams are the culprit, not the query.
