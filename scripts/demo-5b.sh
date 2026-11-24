#!/usr/bin/env bash
# ==============================================================================
# FORSA (WAMS) — Script de Démonstration Multi-Instances & Traefik Load Balancing
# Module : Web Architectures & Microservices (UMBB ING4 GL)
# Superviseur : Dr. Yahiatene Youcef
# ==============================================================================

set -e

TRAEFIK_URL="${TRAEFIK_URL:-http://localhost}"
MS1_PORT_1="${MS1_PORT_1:-3001}"
MS1_PORT_2="${MS1_PORT_2:-3002}"

echo "======================================================================"
echo "🌱 FORSA — Démonstration Multi-Instances MS1 & Traefik Load Balancing"
echo "======================================================================"

echo ""
echo "--- 1. Vérification directe des deux instances MS1 ---"
echo "Instance 1 (Port $MS1_PORT_1) :"
curl -s -i "http://localhost:$MS1_PORT_1/health" | grep -E "HTTP/|X-Instance-Id|service" || true

echo ""
echo "Instance 2 (Port $MS1_PORT_2) :"
curl -s -i "http://localhost:$MS1_PORT_2/health" | grep -E "HTTP/|X-Instance-Id|service" || true

echo ""
echo "--- 2. Vérification du Load Balancing Traefik (Round-Robin via Consul) ---"
echo "Envoi de 4 requêtes consécutives vers $TRAEFIK_URL/health :"
for i in {1..4}; do
  echo -n "Requête #$i -> "
  curl -s -i "$TRAEFIK_URL/health" | grep -i "X-Instance-Id" || echo "Erreur ou en-tête manquant"
done

echo ""
echo "======================================================================"
echo "--- 3. Requête Authentifiée GET /api/shops/geocode à travers Traefik ---"
echo "======================================================================"

# Statut d'obtention de token automatique par login Telegram :
echo "[INFO] Obtention automatique de JWT via authentification Telegram : NOT EXECUTED"
echo "[INFO] Raison : Le protocole FORSA exige une interaction réelle avec le bot"
echo "       Telegram officiel @forsa_auth_bot sur smartphone (anti-contournement)."

# ==============================================================================
# DEV-ONLY TOOL: Générateur de JWT hors-ligne pour tests locaux de démonstration.
# NE JAMAIS UTILISER EN PRODUCTION : refuse de s'exécuter si NODE_ENV=production.
# ==============================================================================
if [ "${NODE_ENV:-}" = "production" ]; then
  echo "[REFUSED] Outil dev-only de génération JWT hors-ligne interdit lorsque NODE_ENV=production."
  echo "Résultat de l'appel géocodage à travers Traefik : NOT EXECUTED"
  exit 1
fi

KEY_PATH="${JWT_PRIVATE_KEY_PATH:-services/ms1-accounts/keys/private.pem}"

echo ""
echo "Tentative d'exécution avec outil dev-only hors-ligne (clé lue depuis JWT_PRIVATE_KEY_PATH) :"
if [ -f "$KEY_PATH" ]; then
  echo "Génération locale d'un token JWT RS256 de test dev-only..."
  TEST_TOKEN=$(JWT_PRIVATE_KEY_PATH="$KEY_PATH" node -e "
    // DEV-ONLY TOOL — refuse de s'exécuter en production
    if (process.env.NODE_ENV === 'production') {
      console.error('[REFUSED] Offline JWT helper is disabled in production.');
      process.exit(1);
    }
    const jwt = require('jsonwebtoken');
    const fs = require('fs');
    const keyPath = process.env.JWT_PRIVATE_KEY_PATH;
    const privateKey = fs.readFileSync(keyPath, 'utf8');
    const token = jwt.sign(
      { sub: 'test-user-wams-demo', roles: ['MERCHANT'], mode: 'merchant' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '15m', issuer: 'forsa-ms1-accounts', keyid: process.env.JWT_KEY_ID || 'forsa-ms1-auth-v1' }
    );
    process.stdout.write(token);
  " 2>/dev/null || echo "")

  if [ -n "$TEST_TOKEN" ]; then
    # Ne jamais afficher le token complet dans les journaux
    TOKEN_PREFIX="${TEST_TOKEN:0:12}"
    echo "Token dev-only généré (masqué) : ${TOKEN_PREFIX}...[REDACTED]"
    echo "Exécution de la requête géocodage authentifiée via Traefik :"
    curl -s -i \
      -H "Authorization: Bearer $TEST_TOKEN" \
      "$TRAEFIK_URL/api/shops/geocode?q=Alger" | grep -E "HTTP/|X-Instance-Id|Content-Type" || true
  else
    echo "Impossible de signer le token dev-only localement (Node.js ou dépendance jsonwebtoken manquante)."
    echo "Résultat de l'appel géocodage à travers Traefik : NOT EXECUTED"
  fi
else
  echo "Clé privée RSA introuvable à JWT_PRIVATE_KEY_PATH ($KEY_PATH)."
  echo "Résultat de l'appel géocodage à travers Traefik : NOT EXECUTED"
fi

echo ""
echo "======================================================================"
echo "Démonstration terminée."
echo "======================================================================"
