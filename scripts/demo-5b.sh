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

echo ""
echo "Tentative d'exécution avec token de test hors-ligne :"
if [ -f "services/ms1-accounts/keys/private.pem" ]; then
  echo "Génération locale d'un token JWT RS256 de test signé avec private.pem..."
  TEST_TOKEN=$(node -e "
    const jwt = require('jsonwebtoken');
    const fs = require('fs');
    const privateKey = fs.readFileSync('services/ms1-accounts/keys/private.pem', 'utf8');
    const token = jwt.sign(
      { sub: 'test-user-wams-demo', roles: ['MERCHANT'], mode: 'merchant' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '15m' }
    );
    console.log(token);
  " 2>/dev/null || echo "")

  if [ -n "$TEST_TOKEN" ]; then
    echo "Exécution de la requête géocodage authentifiée via Traefik :"
    curl -s -i \
      -H "Authorization: Bearer $TEST_TOKEN" \
      "$TRAEFIK_URL/api/shops/geocode?q=Alger" | grep -E "HTTP/|X-Instance-Id|Content-Type" || true
  else
    echo "Impossible de signer le token de test localement (Node.js ou dépendance jsonwebtoken manquante)."
    echo "Résultat de l'appel géocodage à travers Traefik : NOT EXECUTED"
  fi
else
  echo "Clé privée RSA introuvable à services/ms1-accounts/keys/private.pem."
  echo "Résultat de l'appel géocodage à travers Traefik : NOT EXECUTED"
fi

echo ""
echo "======================================================================"
echo "Démonstration terminée avec succès."
echo "======================================================================"
