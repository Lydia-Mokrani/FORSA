import React from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { cn } from './cn';
import { Icon } from './Icon';
import { Button } from './Button';
import { Chip } from './Chip';

export type MapStatus = 'ok' | 'empty' | 'down';

export interface MapBoxProps {
  /** État d'affichage de la carte */
  status?: MapStatus;
  /** Coordonnées [latitude, longitude] */
  position?: [number, number] | null;
  /** Adresse textuelle pour la pastille flottante au-dessus du repère */
  address?: string;
  /** Niveau de zoom (défaut : 15) */
  zoom?: number;
  /** Callback lors du clic sur le bouton 'Réessayer' (état down) */
  onRetry?: () => void;
  /** Déclenché si >= 3 erreurs de tuiles en moins de 10s */
  onTileError?: () => void;
  /** Afficher la pastille et le texte d'aide sous la carte (défaut: true) */
  showFooter?: boolean;
  className?: string;
}

/**
 * Nettoie et formate l'adresse Nominatim brute pour un affichage compact et élégant :
 * Supprime les répétitions multilingues et limite la largeur pour éviter les débordements sur la carte.
 */
function cleanDisplayAddress(raw?: string): string {
  if (!raw) return '';
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return raw;

  const uniqueParts: string[] = [];
  for (const part of parts) {
    // Épurer les caractères Tifinagh et caractères superflus
    const cleaned = part.replace(/[\u2D30-\u2D7F]/g, '').trim();
    if (cleaned && !uniqueParts.some((u) => u.toLowerCase() === cleaned.toLowerCase())) {
      uniqueParts.push(cleaned);
    }
    if (uniqueParts.length >= 2) break;
  }

  const result = uniqueParts.join(', ');
  if (result.length > 34) {
    return result.slice(0, 31) + '...';
  }
  return result || parts[0];
}

/**
 * Crée l'icône personnalisée Leaflet avec le style exact Figma :
 * Cercle vert sombre #0b2c25, épingle blanche, et étiquette d'adresse flottante blanche compacte.
 */
function createMarkerIcon(address?: string): L.DivIcon {
  const display = cleanDisplayAddress(address);
  const addressHtml = display
    ? `<div style="
        position: absolute;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffffff;
        border-radius: 100px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #0b2c25;
        white-space: nowrap;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        pointer-events: none;
        font-family: inherit;
        border: 1px solid rgba(11,44,37,0.12);
      ">${display}</div>`
    : '';

  return L.divIcon({
    className: 'forsa-map-marker-container',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        ${addressHtml}
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 100px;
          background: #0b2c25;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(11,44,37,0.3);
        ">
          <svg width="20" height="22" viewBox="0 0 19.5 21.5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.3682 20.117C10.9345 20.523 10.3548 20.75 9.75154 20.75C9.14827 20.75 8.5686 20.523 8.13491 20.117C4.16344 16.376 -1.15882 12.1969 1.43669 6.12966C2.84005 2.84916 6.20876 0.75 9.75154 0.75C13.2943 0.75 16.663 2.84916 18.0664 6.12966C20.6586 12.1893 15.3494 16.3889 11.3682 20.117Z" stroke-width="1.5" stroke="white"/>
            <path d="M13.2504 9.75C13.2504 11.683 11.6834 13.25 9.75042 13.25C7.81742 13.25 6.25042 11.683 6.25042 9.75C6.25042 7.817 7.81742 6.25 9.75042 6.25C11.6834 6.25 13.2504 7.817 13.2504 9.75Z" stroke-width="1.5" stroke="white"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Sous-composant contrôleur de la carte pour recentrage et redimensionnement automatique.
 */
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center);
    // Invalidate size pour s'assurer que Leaflet s'adapte au conteneur après le rendu initial
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map, center]);

  return null;
};

/**
 * Composant MapBox conforme aux maquettes Figma FORSA :
 * - Gère 3 états :
 *    1. 'ok' : Carte Leaflet interactive avec repère personnalisé et étiquette d'adresse.
 *    2. 'empty' : État Adresse introuvable (fond vert pâle, icône pin 34px, message d'aide).
 *    3. 'down' : État Service indisponible (fond gris, icône wifi 34px, bouton Réessayer).
 * - Détecte >= 3 erreurs de tuiles en 10 secondes pour déclencher `onTileError`.
 */
export const MapBox: React.FC<MapBoxProps> = ({
  status = 'ok',
  position,
  address,
  zoom = 15,
  onRetry,
  onTileError,
  showFooter = true,
  className,
}) => {
  // Détection des erreurs de tuiles (>= 3 erreurs dans une fenêtre glissante de 10s)
  const tileErrorTimestampsRef = React.useRef<number[]>([]);
  const hasTriggeredTileErrorRef = React.useRef(false);

  React.useEffect(() => {
    tileErrorTimestampsRef.current = [];
    hasTriggeredTileErrorRef.current = false;
  }, [status, position?.[0], position?.[1]]);

  const handleTileError = React.useCallback(() => {
    const now = Date.now();
    tileErrorTimestampsRef.current = [
      ...tileErrorTimestampsRef.current.filter((t) => now - t < 10000),
      now,
    ];

    if (tileErrorTimestampsRef.current.length >= 3 && !hasTriggeredTileErrorRef.current) {
      hasTriggeredTileErrorRef.current = true;
      onTileError?.();
    }
  }, [onTileError]);

  const markerIcon = React.useMemo(() => {
    return createMarkerIcon(address);
  }, [address]);

  // Si status est 'ok' mais pas de position valide, basculer sur 'empty'
  const effectiveStatus = status === 'ok' && !position ? 'empty' : status;

  return (
    <div className={cn('flex flex-col gap-3 w-full', className)}>
      {/* Conteneur principal de la carte */}
      <div className="w-full h-[170px] md:h-[260px] rounded-ui-panel overflow-hidden relative border border-ui-card-border bg-ui-map-ok">
        {effectiveStatus === 'ok' && position && (
          <MapContainer
            center={position}
            zoom={zoom}
            scrollWheelZoom={false}
            attributionControl={false}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />
            <Marker position={position} icon={markerIcon} />
            <MapController center={position} />
          </MapContainer>
        )}

        {effectiveStatus === 'empty' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-ui-map-ok">
            <Icon name="pin-empty" size={34} className="mb-2 opacity-90" />
            <h3 className="text-[15px] font-semibold text-ui-ink">
              Aucune position trouvée
            </h3>
            <p className="text-[13px] font-normal text-ui-text-70 mt-1 max-w-xs">
              Saisissez une adresse valide pour afficher le repère.
            </p>
          </div>
        )}

        {effectiveStatus === 'down' && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-ui-map-down">
            <Icon name="wifioff" size={34} className="mb-2 opacity-90" />
            <h3 className="text-[15px] font-semibold text-ui-ink">
              Carte indisponible
            </h3>
            <p className="text-[13px] font-normal text-ui-text-70 mt-1 mb-3">
              Réessayez dans quelques instants.
            </p>
            {onRetry && (
              <Button
                variant="secondary"
                leftIcon={<Icon name="refresh" size={18} />}
                onClick={onRetry}
              >
                Réessayer
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pied de carte : Pastille d'état + Texte d'aide */}
      {showFooter && (
        <div className="flex flex-col gap-1.5">
          <div>
            {effectiveStatus === 'ok' && (
              <Chip variant="success">Position détectée</Chip>
            )}
            {effectiveStatus === 'empty' && (
              <Chip variant="error">Position non détectée</Chip>
            )}
            {effectiveStatus === 'down' && (
              <Chip variant="warn">Position à confirmer</Chip>
            )}
          </div>

          <p className="hidden md:block text-[13px] font-normal text-ui-text-70">
            {effectiveStatus === 'empty'
              ? 'Corrigez l’adresse pour que les clients puissent vous trouver sur la carte.'
              : 'Les clients proches de vous verront votre commerce sur la carte et dans les résultats.'}
          </p>
        </div>
      )}
    </div>
  );
};
