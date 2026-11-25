#!/usr/bin/env bash
# ==============================================================================
# FORSA (WAMS) — Démonstration de Tolérance aux Pannes & Reprise Asynchrone (MS5)
# Lot 5B-2 : Arrêt de MS5, création de défi sur MS1, redémarrage et reprise MS5
# ==============================================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}  FORSA (WAMS) — Démonstration Tolérance aux Pannes Bot (MS5)      ${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Vérification présence Docker
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker n'est pas installé ou inaccessible. Exécution annulée.${NC}"
  echo -e "${YELLOW}Statut : NOT EXECUTED (Daemon Docker ou CLI non disponible).${NC}"
  exit 1
fi

echo -e "\n${YELLOW}1. Vérification de l'état initial des conteneurs :${NC}"
docker ps --filter "name=forsa-ms" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true

echo -e "\n${YELLOW}2. Simulation de panne : Arrêt du worker bot MS5 (forsa-ms5-notifications)...${NC}"
docker stop forsa-ms5-notifications || {
  echo -e "${YELLOW}⚠️ Conteneur forsa-ms5-notifications introuvable ou déjà arrêté.${NC}"
}
echo -e "${GREEN}✅ MS5 est désormais éteint.${NC}"

echo -e "\n${YELLOW}3. Émission d'une demande de connexion sur MS1 alors que MS5 est indisponible :${NC}"
MS1_URL="${MS1_URL:-http://localhost:3001}"
START_PAYLOAD='{"phone": "+213555889900"}'

echo -e "Appel : POST ${MS1_URL}/api/auth/telegram/start avec ${START_PAYLOAD}"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${MS1_URL}/api/auth/telegram/start" \
  -H "Content-Type: application/json" \
  -d "${START_PAYLOAD}" || true)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS")

echo -e "Réponse HTTP : ${HTTP_CODE}"
echo -e "Corps : ${BODY}"

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Succès : Le défi a été créé sur MS1 et publié sur RabbitMQ.${NC}"
  echo -e "${GREEN}   Le message est conservé en file durable (q.ms5-notifications.*) en attendant MS5.${NC}"
elif [ "$HTTP_CODE" = "503" ]; then
  echo -e "${YELLOW}⚠️ Broker RabbitMQ indisponible (Erreur 503 attendue si broker éteint).${NC}"
else
  echo -e "${RED}❌ Réponse inattendue (HTTP ${HTTP_CODE}).${NC}"
fi

echo -e "\n${YELLOW}4. Redémarrage de MS5 pour reprise asynchrone des messages en attente :${NC}"
docker start forsa-ms5-notifications || {
  echo -e "${YELLOW}⚠️ Impossible de redémarrer forsa-ms5-notifications via Docker.${NC}"
}
sleep 3

echo -e "\n${YELLOW}5. Inspection des journaux de MS5 attestant de la consommation :${NC}"
docker logs --tail 20 forsa-ms5-notifications || true

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}  Fin de la démonstration asynchrone MS1 -> RabbitMQ -> MS5       ${NC}"
echo -e "${GREEN}====================================================================${NC}"
