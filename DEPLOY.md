# LocalLead CRM — deploy (Vercel + Supabase)

## Code checklist

- [ ] No `@base44` packages
- [ ] No `base44Client` / `base44.entities` / `base44.auth` / `media.base44`
- [ ] One client: `src/api/supabaseClient.js`
- [ ] Façade: `src/app/services/crmService.js` (`data`) and `src/adapters/base44/entities.js` (`repo`)
- [ ] AuthContext shape unchanged for existing pages
- [ ] Uploads: Storage bucket `crm-uploads`
- [ ] Realtime payloads are row-shaped (`subscribe`)
- [ ] `supabase/schema.sql` matches the façade
- [ ] `vercel.json` SPA rewrites
- [ ] `.env.example` only — no secrets in git
- [ ] Lockfile does not pin Base44 (`rm package-lock.json && npm install`)
- [ ] No Base44 MCP consent routes
- [ ] One i18n system (`src/i18n.jsx`); no GTranslate

## GitHub

Empty repo, source only, no `node_modules`.  
`main` should contain `package.json`, `index.html`, `src/`, `supabase/schema.sql`, `vercel.json`.

## Supabase

1. Run `supabase/schema.sql` **once** in the SQL Editor.
2. Auth URL config: production Vercel URL + `http://localhost:5173`.
3. Providers: Email + Google (same as original).
4. OAuth callback: `https://<project>.supabase.co/auth/v1/callback`.
5. Create public Storage bucket **`crm-uploads`**. Enable the commented storage policies in `schema.sql`.
6. Enable Realtime on `notifications` (optional: `messages`, `follow_up_tasks`).
7. Copy Project URL + anon key into Vercel as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
8. Service role key only in Edge Function secrets.
9. Confirm `profiles` row on first signup.
10. Old Base44 rows are **not** imported by schema.sql.

### Edge Functions

```bash
supabase functions deploy get-public-form
supabase functions deploy submit-public-form --no-verify-jwt
supabase functions deploy run-daily-followup
```

Schedule `run-daily-followup` at `0 7 * * *` (`Europe/Madrid`).

## Vercel

1. Import the GitHub repo.
2. Framework: Vite. Build: `vite build`. Output: `dist`.
3. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Redeploy after adding env (Vite inlines at build time).
5. Add the production domain to the Supabase Auth allow-list.

## Smoke test

- Register / login / logout / session persists
- Password reset returns to the Vercel URL
- Google OAuth (if enabled)
- Dashboard, contacts, leads load
- Create / edit records
- Public form `/f/:identifier`
- User A cannot see user B’s other company
- Deep links do not 404
- Language switcher: en / es / eu (source DOM is English)

## Residual risks

- `inviteUser` sends a magic link, not a service-role admin invite
- Daily follow-up must be scheduled or it will not run
- Public form submit requires the Edge Function
- Reconstructing missing original pages may differ in visual density from Base44 Builder output
