#!/bin/bash
# ─────────────────────────────────────────────
# Script de déploiement Wooplans — cpbook
# Exécuter une seule fois depuis ton terminal
# ─────────────────────────────────────────────

set -e  # Stop si erreur

echo "🚀 Déploiement Wooplans Catalogue Premium"
echo ""

# 1. Aller dans le dossier du projet (adapter si nécessaire)
# Remplace ~/Desktop/cpbook par le chemin où tu as mis le projet
PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"
echo "📁 Dossier : $PROJECT_DIR"

# 2. Init git si pas encore fait
if [ ! -d ".git" ]; then
  git init
  git branch -m main
  echo "✅ Git initialisé"
fi

# 3. Ajouter le remote GitHub (si pas déjà fait)
if ! git remote get-url origin &>/dev/null; then
  git remote add origin https://github.com/wooplans/cpbook.git
  echo "✅ Remote GitHub ajouté"
fi

# 4. Commit et push
git add .
git commit -m "Deploy: Wooplans Catalogue Premium $(date '+%Y-%m-%d %H:%M')" || echo "Rien à committer"
git push -u origin main
echo ""
echo "✅ Poussé sur GitHub !"
echo "⏳ GitHub Actions va déclencher le déploiement Cloudflare (~30 sec)"
echo "🌐 Suivi : https://github.com/wooplans/cpbook/actions"
