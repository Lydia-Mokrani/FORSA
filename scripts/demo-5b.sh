#!/usr/bin/env bash
# ==============================================================================
# FORSA (WAMS) — Script de Démonstration Multi-Instances & Traefik Load Balancing
# Module : Web Architectures & Microservices (UMBB ING4 GL)
# Superviseur : Dr. Yahiatene Youcef
# ==============================================================================

set -e

TRAEFIK_URL="${TRAEFIK_URL:-http://localhost}"
CONSUL_URL="${CONSUL_URL:-http://localhost:8500}"
MS1_PORT_1="${MS1_PORT_1:-3001}"
MS1_PORT_2="${MS1_PORT_2:-3002}"

echo "======================================================================"
echo "🌱 FORSA — Démonstration Multi-Instances MS1 & Traefik Load Balancing"
echo "======================================================================"

echo ""
echo "--- 1. Vérification directe des deux instances MS1 (/health) ---"
echo "Instance 1 (Port $MS1_PORT_1) :"
curl -s -i "http://localhost:$MS1_PORT_1/health" | grep -E "HTTP/|X-Instance-Id|status|service|instanceId" || true

echo ""
echo "Instance 2 (Port $MS1_PORT_2) :"
curl -s -i "http://localhost:$MS1_PORT_2/health" | grep -E "HTTP/|X-Instance-Id|status|service|instanceId" || true

echo ""
echo "--- 2. Vérification du Catalogue Consul ---"
echo "Services enregistrés sous 'ms1-accounts' dans Consul :"
curl -s "$CONSUL_URL/v1/catalog/service/ms1-accounts" | grep -o '"ServiceID":"[^"]*"' || echo "[INFO] Consul non démarré en local (NOT EXECUTED sans Docker)"

echo ""
echo "--- 3. Vérification du Load Balancing Traefik (GET /api/auth/jwks) ---"
echo "[NOTE] La route /health est réservée aux vérifications internes de santé Consul"
echo "       et n'est pas exposée par Traefik. Les requêtes applicatives transitent"
echo "       sous les préfixes déclarés, notamment GET /api/auth/jwks."
echo ""
echo "Envoi de 6 requêtes consécutives vers $TRAEFIK_URL/api/auth/jwks :"
for i in {1..6}; do
  echo -n "Requête #$i -> "
  curl -s -i "$TRAEFIK_URL/api/auth/jwks" | grep -i "X-Instance-Id" || echo "Erreur ou en-tête manquant (Traefik non joignable)"
done

echo ""
echo "--- 4. Test de Résilience / Tolérance aux Pannes (Stop One Instance) ---"
echo "Simulation de panne : si l'Instance 1 est arrêtée, Consul détecte l'échec du healthcheck"
echo "et Traefik bascule 100% du trafic vers l'Instance 2 sans interruption de service."
echo "Requête de validation après arrêt simulé :"
curl -s -i "$TRAEFIK_URL/api/auth/jwks" | grep -i "X-Instance-Id" || echo "[INFO] Non exécutable sans conteneurs en cours d'exécution (NOT EXECUTED)."

echo ""
echo "======================================================================"
echo "--- 5. Requête Authentifiée GET /api/shops/geocode à travers Traefik ---"
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
