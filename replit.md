# Running on Replit

- Keep the existing React, TypeScript, Vite, Tailwind CSS, and Supabase stack.
- Runtime: Node.js 22 (required by the installed Supabase packages).
- Use the **Start application** workflow, which runs `npm run dev`.
- Vite listens on `0.0.0.0:5000` and accepts Replit's proxied preview hosts.
- Install dependencies with npm using the existing `package-lock.json`.
- Check the production build with `npm run build`; run lint with `npm run lint`.

## Current scope

The imported application is a Phase 0 setup/briefing screen. Gameplay and the other views described in the README are planned, not implemented. The current screen does not import the Supabase client and needs no credentials.

## Supabase

No database has been provisioned, migrated, or seeded during Replit setup. Before enabling database-backed features, configure the user's existing Supabase project with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` through Replit's environment/secrets tooling. Do not invent credentials or substitute a different database. Vite exposes `VITE_` values to the browser: never use a Supabase service-role key there.

Review `src/db/schema.sql` and the seed script before applying them to a user-provided database. `db:reset` is listed in package.json but its target script is absent in the import; do not run it.
