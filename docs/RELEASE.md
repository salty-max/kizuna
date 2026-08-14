# Déploiement Vercel

## Contrat du projet

Kizuna est déployé comme application Vite statique sur Vercel. La configuration
versionnée dans `vercel.json` fixe :

- Bun et la commande stricte `bun run build:vercel` ;
- le dossier publié `dist/` ;
- les headers de sécurité et caches navigateur ;
- le fallback `/index.html` pour les fiches SPA, après priorité aux fichiers pré-rendus.

Projet lié : `jellycat/kizuna`. Production :
[`kizuna-green.vercel.app`](https://kizuna-green.vercel.app).

Le build utilise d'abord `SITE_URL` lorsqu'il est fourni. Sur Vercel, il utilise sinon
`VERCEL_PROJECT_PRODUCTION_URL`, domaine stable de production également disponible
pendant les previews. Les canonical et images sociales d'une preview ne pointent donc
jamais vers son URL éphémère.

Vercel doit servir le projet à la racine d'un domaine ou sous-domaine. Un `SITE_URL`
avec sous-chemin, tel que `https://example.com/kizuna`, est refusé par la vérification.

## Première installation

```bash
bunx vercel login
bunx vercel link
bunx vercel pull --environment=preview
```

Dans les réglages du projet, activer l'exposition automatique des variables système
Vercel. Vérifier ensuite que `VERCEL_PROJECT_PRODUCTION_URL` est présente. Un domaine
personnalisé peut être ajouté après le premier déploiement :

```bash
bunx vercel domains add kizuna.example.com <project-name>
bunx vercel domains inspect kizuna.example.com
```

Vercel détecte Bun grâce à `bun.lock` et respecte la version déclarée dans
`package.json`. Le dossier `.vercel/` créé par le lien reste local et ignoré par Git.
Une preview anonyme est volontairement refusée : sans projet authentifié, Vercel ne
fournit pas de domaine de production stable et le build ne peut pas produire de
canonical fiable.

### Backend cloud optionnel

Pour activer les comptes et la synchronisation, appliquer d'abord la migration décrite
dans [`BACKEND.md`](BACKEND.md), puis ajouter à Vercel :

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Ces variables sont publiques par définition dans un bundle Vite. Seule la clé
publishable convient ; ne jamais y placer une clé `service_role`. Sans ces variables,
le build reste volontairement local-only.

L'authentification utilisateur passe par Discord OAuth : le Client Secret Discord reste
uniquement dans la configuration du provider Supabase. Aucun SMTP n'est nécessaire.

## Preview puis production

Avant chaque release :

```bash
bun run check
VERCEL_PROJECT_PRODUCTION_URL=kizuna-green.vercel.app bun run build:vercel
bun run perf:budget
bun run test:e2e
```

Déployer ensuite une preview :

```bash
bunx vercel deploy
```

Contrôler l'accueil, une page catalogue, une fiche détail, un partage KZ1,
`/robots.txt`, `/sitemap.xml`, la carte sociale et les headers HTTP. Lorsque la preview
est validée :

```bash
bunx vercel deploy --prod
```

Pour séparer construction et mise en ligne, Vercel permet aussi `vercel build`, puis
`vercel deploy --prebuilt`.

## Cache

Les fichiers statiques sont déjà conservés sur le CDN Vercel pour la durée du
déploiement. `vercel.json` précise en plus le cache navigateur :

| Chemin                | Cache-Control                                          |
| --------------------- | ------------------------------------------------------ |
| `assets/*`            | `public, max-age=31536000, immutable`                  |
| `data/*`              | `public, max-age=3600, stale-while-revalidate=86400`   |
| `icons/*`, `social/*` | `public, max-age=86400, stale-while-revalidate=604800` |
| HTML                  | valeur Vercel par défaut : revalidation immédiate      |

Les assets Vite peuvent être immuables parce que leur nom contient un hash. Les données
et icônes gardent un TTL plus court car leur nom reste stable entre deux versions.

## Rollback

Chaque déploiement Vercel est un artefact indivisible et possède une URL permanente.
Pour revenir à la production précédente :

```bash
bunx vercel rollback <deployment-id-or-url>
```

Sur le plan Hobby, le rollback est limité au déploiement de production précédent. Pour
annuler un rollback, promouvoir de nouveau un déploiement :

```bash
bunx vercel promote <deployment-id-or-url>
```

Les équipes locales et les codes KZ1 restent indépendants de ces opérations.

## Sources Vercel

- [Vite sur Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Configuration `vercel.json`](https://vercel.com/docs/project-configuration/vercel-json)
- [Variables système](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Déploiement CLI](https://vercel.com/docs/projects/deploy-from-cli)
- [Cache-Control](https://vercel.com/docs/caching/cache-control-headers)
- [Rollback](https://vercel.com/docs/cli/rollback)
