# Vercel deployment

## Project contract

Kizuna is deployed as a static Vite application on Vercel. The configuration
versioned in `vercel.json` pins:

- Bun and the strict `bun run build:vercel` command;
- `dist/` as the published directory;
- the security headers and browser caches;
- the `/index.html` fallback for SPA detail pages, after prerendered files take
  priority.

Linked project: `jellycat/kizuna`. Production:
[`kizuna-green.vercel.app`](https://kizuna-green.vercel.app).

The build uses `SITE_URL` first when it is provided. On Vercel it otherwise uses
`VERCEL_PROJECT_PRODUCTION_URL`, the stable production domain that is also available
during previews. A preview's canonicals and social images therefore never point at
its ephemeral URL.

Vercel must serve the project at the root of a domain or subdomain. A `SITE_URL` with
a sub-path, such as `https://example.com/kizuna`, is rejected by the verification.

## First-time setup

```bash
bunx vercel login
bunx vercel link
bunx vercel pull --environment=preview
```

In the project settings, enable automatic exposure of Vercel's system variables. Then
check that `VERCEL_PROJECT_PRODUCTION_URL` is present. A custom domain can be added
after the first deployment:

```bash
bunx vercel domains add kizuna.example.com <project-name>
bunx vercel domains inspect kizuna.example.com
```

Vercel detects Bun from `bun.lock` and honours the version declared in `package.json`.
The `.vercel/` directory created by linking stays local and is ignored by Git. An
anonymous preview is deliberately refused: without an authenticated project, Vercel
provides no stable production domain and the build cannot produce a reliable
canonical.

### Optional cloud backend

To enable accounts and synchronisation, first apply the migration described in
[`BACKEND.md`](BACKEND.md), then add to Vercel:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

These variables are public by definition in a Vite bundle. Only the publishable key is
appropriate; never put a `service_role` key there. Without these variables, the build
stays deliberately local-only.

User authentication goes through Discord OAuth: the Discord Client Secret stays only
in the Supabase provider configuration. No SMTP is required.

## Preview, then production

Before every release:

```bash
bun run check
VERCEL_PROJECT_PRODUCTION_URL=kizuna-green.vercel.app bun run build:vercel
bun run perf:budget
bun run test:e2e
```

Then deploy a preview:

```bash
bunx vercel deploy
```

Check the home page, a catalogue page, a detail sheet, a KZ1 share, `/robots.txt`,
`/sitemap.xml`, the social card and the HTTP headers. Once the preview is approved:

```bash
bunx vercel deploy --prod
```

To separate building from going live, Vercel also allows `vercel build`, then
`vercel deploy --prebuilt`.

## Cache

Static files are already retained on Vercel's CDN for the lifetime of the deployment.
`vercel.json` additionally specifies the browser cache:

| Path                  | Cache-Control                                          |
| --------------------- | ------------------------------------------------------ |
| `assets/*`            | `public, max-age=31536000, immutable`                  |
| `data/*`              | `public, max-age=3600, stale-while-revalidate=86400`   |
| `icons/*`, `social/*` | `public, max-age=86400, stale-while-revalidate=604800` |
| HTML                  | Vercel default: immediate revalidation                 |

Vite assets can be immutable because their names contain a hash. Data and icons keep a
shorter TTL since their names stay stable between two versions.

## Rollback

Each Vercel deployment is an indivisible artifact and has a permanent URL. To return
to the previous production:

```bash
bunx vercel rollback <deployment-id-or-url>
```

On the Hobby plan, rollback is limited to the previous production deployment. To undo
a rollback, promote a deployment again:

```bash
bunx vercel promote <deployment-id-or-url>
```

Local teams and KZ1 codes stay independent of these operations.

## Vercel sources

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [`vercel.json` configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [System variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [CLI deployment](https://vercel.com/docs/projects/deploy-from-cli)
- [Cache-Control](https://vercel.com/docs/caching/cache-control-headers)
- [Rollback](https://vercel.com/docs/cli/rollback)
