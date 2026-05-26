# Wooplans — Catalogue Premium

Landing page du Catalogue Premium Wooplans, hébergée sur `cpbook.wooplans.com`.

## Stack
- HTML/CSS/JS vanilla — fichier unique `index.html`
- Hébergé sur **Cloudflare Pages**
- Déploiement automatique à chaque push sur `main`

## Déploiement automatique

Chaque `git push` sur la branche `main` déclenche automatiquement un déploiement sur Cloudflare Pages via GitHub Actions.

## Configuration requise (secrets GitHub)

Dans `Settings → Secrets and variables → Actions` de ce repo, ajouter :

| Secret | Valeur |
|--------|--------|
| `CLOUDFLARE_API_TOKEN` | Token API Cloudflare (voir ci-dessous) |
| `CLOUDFLARE_ACCOUNT_ID` | Ton Account ID Cloudflare |

### Créer le token Cloudflare
1. Va sur https://dash.cloudflare.com/profile/api-tokens
2. Clique "Create Token"
3. Utilise le template **"Edit Cloudflare Workers"**
4. Ajoute la permission **Cloudflare Pages: Edit**
5. Copie le token généré → GitHub Secret `CLOUDFLARE_API_TOKEN`

### Trouver ton Account ID
Dans le dashboard Cloudflare → n'importe quel domaine → colonne droite → "Account ID"

## Sous-domaine cpbook.wooplans.com

Après le premier déploiement :
1. Dans Cloudflare Pages → projet `wooplans-cpbook` → "Custom domains"
2. Ajoute `cpbook.wooplans.com`
3. Le CNAME est créé automatiquement (wooplans.com est déjà sur Cloudflare)

## Modifier le site

1. Modifie `index.html`
2. `git add . && git commit -m "update" && git push`
3. Le site se met à jour en ~30 secondes

## À personnaliser

- **Numéro WhatsApp** : chercher `237600000000` dans `index.html`
- **Vidéo VSL** : chercher `vsl-wooplans.mp4` dans `index.html`
