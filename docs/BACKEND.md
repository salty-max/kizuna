# Optional Supabase backend

Kizuna is a static Vite application. Supabase adds optional Discord authentication and
private cloud saves; the builder, local storage and shared KZ1 links continue to work
without it.

## Implemented scope

- Discord OAuth session and sign-out;
- private team listing, save, restore and deletion;
- local save before each cloud synchronization attempt;
- append-only payload history in PostgreSQL;
- owner isolation through Row Level Security.

Public team pages, version restoration, account deletion and write-rate limits are not
implemented in the client yet. The schema reserves visibility and version history for
those later features.

## Repository entry points

- browser client and session: `src/backend/`;
- schema and RLS policies: `supabase/migrations/20260813210000_cloud_teams.sql`;
- local Supabase configuration: `supabase/config.toml`;
- environment template: `.env.example`.

Team payloads reuse the versioned KZ1 sharing format. The database stores catalogue
identifiers, not a duplicate of the game's thousands of characters and assets.

## Configuration

1. Create or link a Supabase project.
2. Apply the migration with the Supabase CLI or SQL Editor.
3. Create a Discord OAuth application.
4. Add the Supabase callback shown by the Discord provider to the Discord application:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
5. Enable Discord under Supabase Authentication providers and enter the Discord Client
   ID and Client Secret there.
6. Configure the production Site URL and allowed local/preview redirect URLs in
   Supabase Authentication.
7. Add these browser-safe variables locally and on Vercel:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Then rebuild or redeploy the application.

## Security model

The publishable key identifies the Supabase project but grants no administrative
privilege. Every cloud operation requires an authenticated user JWT, and PostgreSQL
RLS restricts teams and versions to their owner.

Never place any of the following in source control or a `VITE_*` variable:

- Supabase `service_role` keys;
- Discord Client Secrets;
- database passwords or personal access tokens.

Authorization belongs in database policies or a trusted server function, never only
in React visibility checks. Review the migration whenever cloud behavior changes.
