# Politique de sécurité

## Versions prises en charge

Kizuna évolue avant sa première version stable. Seule la dernière révision de `main`
reçoit les correctifs de sécurité.

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique contenant un secret, une preuve d’exploitation ou une
donnée personnelle. Utilisez le signalement privé de vulnérabilité GitHub du dépôt.
S’il n’est pas disponible, ouvrez une issue minimale demandant un canal privé, sans
détail exploitable.

Indiquez la version concernée, l’impact, les étapes minimales de reproduction et, si
possible, une proposition de correction.

## Périmètre

L’interface est une application Vite statique. Les comptes Discord et sauvegardes
cloud optionnelles utilisent Supabase Auth et PostgreSQL. Les équipes locales et les
liens KZ1 ne nécessitent aucun compte.

Les protections principales sont :

- aucune clé `service_role` ni secret OAuth dans le bundle navigateur ;
- authentification vérifiée avant chaque opération cloud ;
- Row Level Security sur les profils, équipes et versions ;
- équipes privées par défaut ;
- limites de format et de taille sur les payloads enregistrés ;
- headers de sécurité définis dans `vercel.json`.

Les partages publics, la suppression de compte et le rate limiting ne doivent pas être
présentés comme disponibles tant que leur parcours complet n’est pas implémenté et
vérifié.
