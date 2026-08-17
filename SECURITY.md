# Security policy

## Supported versions

Kizuna is still moving toward its first stable release. Only the latest revision of
`main` receives security fixes.

## Reporting a vulnerability

Do not open a public issue containing a secret, a proof of exploitation or personal
data. Use the repository's GitHub private vulnerability reporting. If that is
unavailable, open a minimal issue asking for a private channel, with no exploitable
detail.

State the affected version, the impact, the minimal reproduction steps and, where
possible, a proposed fix.

## Scope

The interface is a static Vite application. Optional Discord accounts and cloud saves
use Supabase Auth and PostgreSQL. Local teams and KZ1 links require no account.

The primary protections are:

- no `service_role` key and no OAuth secret in the browser bundle;
- authentication verified before every cloud operation;
- Row Level Security on profiles, teams and versions;
- teams private by default;
- format and size limits on saved payloads;
- security headers defined in `vercel.json`.

Public sharing, account deletion and rate limiting must not be presented as available
until their full journey is implemented and verified.
