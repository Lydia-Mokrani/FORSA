// frontend/src/features/profile/LocationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useLocation, UserLocation } from '../catalogue/context/LocationContext';
import { updateUserProfile } from '../auth/services/authService';

// Figma Icons import
import figmaSearch from '../../assets/figma/1c04f287-7cb8-4ddb-86a5-22104e20e639.svg';
import figmaGPSButton from '../../assets/figma/987d478f-1c51-4083-9708-6e9bf076c2ff.svg';
import figmaPastillePin from '../../assets/figma/cc0d09a2-dcb3-4b82-8612-9a85beaaaec2.svg';
import figmaDarkPin from '../../assets/figma/66b0aa85-93c0-4cc1-b6bd-139fee5de91f.svg';
import figmaCompassGps from '../../assets/figma/dda2f6ee-aca2-407f-9a09-a7a46a752009.svg';
import figmaMyPosPin from '../../assets/figma/e9783857-3efc-4c3e-b5fd-8d4fc87d2d1d.svg';
import figmaArrowRight from '../../assets/figma/2a1c7007-85a2-4361-b158-6c3901ee6239.svg';
import figmaEditPen from '../../assets/figma/1aa61277-bb85-4813-8006-2d5bae937b08.svg';
import figmaBuildingCity from '../../assets/figma/7d0a46f1-5aa3-474a-a2ae-310e522dceb3.svg';
import figmaCityIcon from '../../assets/figma/2556b715-bc6f-4b54-9446-a09ca2d4f416.svg';
import figmaInfoCircle from '../../assets/figma/358c3b70-e044-4420-8a62-12e67cc84fd5.svg';
import figmaHeaderLocation from '../../assets/figma/b027565f-330c-438d-8e75-763aa35119eb.svg';
import figmaHeaderBell from '../../assets/figma/b5a3fed0-7e75-428d-bde2-d289d8362364.svg';
import figmaUnreadIndicator from '../../assets/figma/f90091a6-8256-4c7b-808d-68b1b56f5b67.svg';
import figmaFoodAvatar from '../../assets/figma/e7f7445d-b6d0-4bf3-973d-ffa1d0affdba.png';

const ALGERIAN_WILAYAS = [
  { code: '01', name: 'Adrar', lat: 27.8742, lng: -0.2939 },
  { code: '02', name: 'Chlef', lat: 36.1654, lng: 1.3345 },
  { code: '03', name: 'Laghouat', lat: 33.8000, lng: 2.8651 },
  { code: '04', name: 'Oum El Bouaghi', lat: 35.8755, lng: 7.1135 },
  { code: '05', name: 'Batna', lat: 35.5559, lng: 6.1741 },
  { code: '06', name: 'Béjaïa', lat: 36.7559, lng: 5.0843 },
  { code: '07', name: 'Biskra', lat: 34.8504, lng: 5.7281 },
  { code: '08', name: 'Béchar', lat: 31.6167, lng: -2.2167 },
  { code: '09', name: 'Blida', lat: 36.4706, lng: 2.8275 },
  { code: '10', name: 'Bouira', lat: 36.3749, lng: 3.9020 },
  { code: '11', name: 'Tamanrasset', lat: 22.7850, lng: 5.5228 },
  { code: '12', name: 'Tébessa', lat: 35.4042, lng: 8.1242 },
  { code: '13', name: 'Tlemcen', lat: 34.8783, lng: -1.3150 },
  { code: '14', name: 'Tiaret', lat: 35.3710, lng: 1.3170 },
  { code: '15', name: 'Tizi Ouzou', lat: 36.7118, lng: 4.0459 },
  { code: '16', name: 'Alger', lat: 36.7538, lng: 3.0588 },
  { code: '17', name: 'Djelfa', lat: 34.6728, lng: 3.2530 },
  { code: '18', name: 'Jijel', lat: 36.8206, lng: 5.7667 },
  { code: '19', name: 'Sétif', lat: 36.1911, lng: 5.4137 },
  { code: '20', name: 'Saïda', lat: 34.8303, lng: 0.1517 },
  { code: '21', name: 'Skikda', lat: 36.8762, lng: 6.9092 },
  { code: '22', name: 'Sidi Bel Abbès', lat: 35.1899, lng: -0.6308 },
  { code: '23', name: 'Annaba', lat: 36.9000, lng: 7.7667 },
  { code: '24', name: 'Guelma', lat: 36.4621, lng: 7.4261 },
  { code: '25', name: 'Constantine', lat: 36.3650, lng: 6.6147 },
  { code: '26', name: 'Médéa', lat: 36.2642, lng: 2.7539 },
  { code: '27', name: 'Mostaganem', lat: 35.9312, lng: 0.0892 },
  { code: '28', name: 'M\'Sila', lat: 35.7058, lng: 4.5419 },
  { code: '29', name: 'Mascara', lat: 35.3948, lng: 0.1403 },
  { code: '30', name: 'Ouargla', lat: 31.9493, lng: 5.3250 },
  { code: '31', name: 'Oran', lat: 35.6987, lng: -0.6349 },
  { code: '32', name: 'El Bayadh', lat: 33.6832, lng: 1.0193 },
  { code: '33', name: 'Illizi', lat: 26.4833, lng: 8.4667 },
  { code: '34', name: 'Bordj Bou Arreridj', lat: 36.0732, lng: 4.7611 },
  { code: '35', name: 'Boumerdès', lat: 36.7664, lng: 3.4772 },
  { code: '36', name: 'El Tarf', lat: 36.7672, lng: 8.3138 },
  { code: '37', name: 'Tindouf', lat: 27.6711, lng: -8.1478 },
  { code: '38', name: 'Tissemsilt', lat: 35.6072, lng: 1.8108 },
  { code: '39', name: 'El Oued', lat: 33.3683, lng: 6.8674 },
  { code: '40', name: 'Khenchela', lat: 35.4358, lng: 7.1433 },
  { code: '41', name: 'Souk Ahras', lat: 36.2864, lng: 7.9511 },
  { code: '42', name: 'Tipaza', lat: 36.5897, lng: 2.4475 },
  { code: '43', name: 'Mila', lat: 36.4503, lng: 6.2644 },
  { code: '44', name: 'Aïn Defla', lat: 36.2641, lng: 1.9679 },
  { code: '45', name: 'Naâma', lat: 33.2667, lng: -0.3167 },
  { code: '46', name: 'Aïn Témouchent', lat: 35.2975, lng: -1.1404 },
  { code: '47', name: 'Ghardaïa', lat: 32.4909, lng: 3.6736 },
  { code: '48', name: 'Relizane', lat: 35.7373, lng: 0.5559 },
  { code: '49', name: 'Timimoun', lat: 29.2639, lng: 0.2310 },
  { code: '50', name: 'Bordj Badji Mokhtar', lat: 21.3283, lng: 0.9547 },
  { code: '51', name: 'Ouled Djellal', lat: 34.4333, lng: 5.0667 },
  { code: '52', name: 'Béni Abbès', lat: 30.1333, lng: -2.1667 },
  { code: '53', name: 'In Salah', lat: 27.1935, lng: 2.4607 },
  { code: '54', name: 'In Guezzam', lat: 19.5683, lng: 5.7686 },
  { code: '55', name: 'Touggourt', lat: 33.1064, lng: 6.0594 },
  { code: '56', name: 'Djanet', lat: 24.5539, lng: 9.4844 },
  { code: '57', name: 'El M\'Ghair', lat: 33.9483, lng: 5.9222 },
  { code: '58', name: 'El Meniaa', lat: 30.5847, lng: 2.8839 },
];

// Commerces partenaires de démonstration sur la carte (Figma 1364:92691 - 1364:92703)
const SAMPLE_SHOPS = [
  { id: 's1', name: 'La Boulangerie', lat: 36.7580, lng: 3.0640, isPrimary: true },
  { id: 's2', name: 'Pâtisserie Nour', lat: 36.7490, lng: 3.0510 },
  { id: 's3', name: 'Laiterie Atlas', lat: 36.7620, lng: 3.0720 },
  { id: 's4', name: 'Boulangerie du Parc', lat: 36.7440, lng: 3.0610 },
  { id: 's5', name: 'Pâtisserie Rose', lat: 36.7420, lng: 3.0480 },
];

function createLocationMarkerIcon(label?: string): L.DivIcon {
  const display = label ? (label.length > 25 ? label.slice(0, 22) + '...' : label) : '';
  const labelHtml = display
    ? `<div style="
        position: absolute;
        bottom: 46px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffffff;
        border-radius: 100px;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 600;
        color: #0b2c25;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        border: 1px solid rgba(11,44,37,0.15);
        pointer-events: none;
        font-family: inherit;
      ">${display}</div>`
    : '';

  return L.divIcon({
    className: 'forsa-user-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        ${labelHtml}
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 100px;
          background: #0b2c25;
          border: 3px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(11,44,37,0.4);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function createShopMarkerIcon(name: string, isPrimary = false): L.DivIcon {
  const bg = isPrimary ? '#0b2c25' : '#ffffff';
  const color = isPrimary ? '#ffffff' : '#0b2c25';
  const border = isPrimary ? 'border: 2px solid #17664e;' : 'border: 1px solid rgba(11,44,37,0.2);';

  return L.divIcon({
    className: 'forsa-shop-marker',
    html: `
      <div style="
        background: ${bg};
        color: ${color};
        ${border}
        border-radius: 100px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        white-space: nowrap;
        pointer-events: auto;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${isPrimary ? '#6ee7b7' : '#17664e'};"></span>
        <span>${name}</span>
      </div>
    `,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const LocationPage: React.FC = () => {
  const navigate = useNavigate();
  const { location, setLocation } = useLocation();

  const [selectedLat, setSelectedLat] = useState<number>(location.lat || 36.7538);
  const [selectedLng, setSelectedLng] = useState<number>(location.lng || 3.0588);
  const [selectedLabel, setSelectedLabel] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        const loc = u.preferences?.preferredLocation || u.preferredLocation;
        if (loc) return loc;
      }
    } catch {}
    return location.label || 'Bab Ezzouar, Alger';
  });
  const [radiusKm, setRadiusKm] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        const rad = u.preferences?.searchRadiusKm || u.searchRadiusKm;
        if (rad) return rad;
      }
    } catch {}
    return (location as any).radius || 10;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [showCitySelect, setShowCitySelect] = useState(false);

  const userAvatar = (() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        return u.avatarUrl || null;
      }
    } catch {}
    return null;
  })();

  // Détection GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLat(lat);
        setSelectedLng(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            setSelectedLabel(parts.slice(0, 3).join(',').trim());
          } else {
            setSelectedLabel('Ma position GPS');
          }
        } catch {
          setSelectedLabel('Ma position GPS');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('GPS error:', err);
        setGpsLoading(false);
        alert('Impossible d’accéder à votre position GPS. Veuillez vérifier vos autorisations ou choisir une ville.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Clic sur la carte pour définir la position
  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        setSelectedLabel(parts.slice(0, 3).join(',').trim());
      }
    } catch {}
  };

  // Recherche d'adresse
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim() + ', Algérie'
        )}&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        setSelectedLabel(item.display_name.split(',')[0]);
      } else {
        alert('Aucune adresse trouvée pour cette recherche en Algérie.');
      }
    } catch {
      alert('Erreur lors de la recherche.');
    } finally {
      setSearching(false);
    }
  };

  // Sélection de wilaya
  const handleSelectWilaya = (wilayaName: string) => {
    const found = ALGERIAN_WILAYAS.find((w) => w.name === wilayaName);
    if (found) {
      setSelectedLat(found.lat);
      setSelectedLng(found.lng);
      setSelectedLabel(`${found.name}, Algérie`);
      setShowCitySelect(false);
    }
  };

  // Sauvegarde
  const handleSave = async () => {
    setSaving(true);
    const newLoc: UserLocation = {
      lat: selectedLat,
      lng: selectedLng,
      label: selectedLabel,
    };
    (newLoc as any).radius = radiusKm;

    setLocation(newLoc);

    try {
      const cached = localStorage.getItem('forsa_user');
      let currentPrefs: any = {};
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          currentPrefs = parsed.preferences || {};
        } catch {}
      }

      const updatedPrefs = {
        ...currentPrefs,
        preferredLocation: selectedLabel,
        preferredCoordinates: { lat: selectedLat, lng: selectedLng },
        searchRadiusKm: radiusKm,
      };

      await updateUserProfile({
        preferredLocation: selectedLabel,
        searchRadiusKm: radiusKm,
      });

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.preferredLocation = selectedLabel;
          parsed.preferences = updatedPrefs;
          localStorage.setItem('forsa_user', JSON.stringify(parsed));
        } catch {}
      }

      setSuccessBanner(true);
      setTimeout(() => {
        navigate('/profile');
      }, 1200);
    } catch (err: any) {
      console.error(err);
      navigate('/profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen bg-[#fffaf0] font-poppins text-[#0B2C25] pb-[28px] pt-[30px] px-4 sm:px-[40px] select-none"
      data-node-id="1364:92386"
      data-name="Desktop · Localisation — Ma localisation"
    >
      <div className="max-w-[1202px] mx-auto flex flex-col gap-[24px]">
        {/* ── EN-TÊTE DE PAGE (Figma 1364:92389) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[24px] w-full" data-node-id="1364:92389" data-name="Page header">
          {/* Introduction (1364:92390) */}
          <div className="flex flex-col gap-[3px] text-[#0b2c25]" data-node-id="1364:92390">
            <p className="font-normal text-[11px] text-[#0b2c25]/75" data-node-id="1364:92391">
              Mon espace / Profil / Modifier le profil / Ma localisation
            </p>
            <h1 className="font-semibold text-[36px] sm:text-[48px] text-[#0b2c25] leading-tight" data-node-id="1364:92392">
              Ma localisation
            </h1>
            <p className="font-normal text-[16px] sm:text-[20px] text-[#0b2c25]/85" data-node-id="1364:92393">
              Choisissez la zone où trouver les offres près de vous.
            </p>
          </div>

          {/* Account actions (1364:92394) */}
          <div className="flex items-center gap-[14px] shrink-0 self-start md:self-center" data-node-id="1364:92394">
            {/* Position actuelle dans le header (1364:92395) */}
            <div
              onClick={() => navigate('/location')}
              className="hidden sm:flex items-center gap-[7px] pr-[12px] cursor-pointer hover:opacity-80 transition"
              data-node-id="1364:92395"
              title="Modifier ma localisation"
            >
              <img src={figmaHeaderLocation} alt="" className="size-[18px] shrink-0" />
              <span className="font-normal text-[12px] text-[#0b2c25] leading-[1.5] max-w-[150px] truncate">
                {selectedLabel}
              </span>
            </div>

            {/* Notifications entry (1364:92398) */}
            <div
              onClick={() => navigate('/notifications')}
              className="relative size-[42px] rounded-full flex items-center justify-center cursor-pointer hover:bg-white/60 transition bg-white/40"
              data-node-id="1364:92398"
              title="Notifications"
            >
              <img src={figmaHeaderBell} alt="" className="size-[22px] shrink-0" />
              <img
                src={figmaUnreadIndicator}
                alt=""
                className="absolute top-[8px] left-[27px] size-[7px]"
              />
            </div>

            {/* Circular User Avatar (1364:92401) */}
            <div
              onClick={() => navigate('/profile')}
              className="relative size-[44px] rounded-full overflow-hidden shrink-0 bg-[#0B2C25] text-white flex items-center justify-center border border-black/5 shadow-xs cursor-pointer hover:opacity-90 transition"
              data-node-id="1364:92401"
              title="Mon profil"
            >
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" className="size-full object-cover" />
              ) : (
                <svg className="size-[22px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Bannière de confirmation */}
        {successBanner && (
          <div className="p-4 rounded-[16px] bg-[#eef7ec] border border-[#235347]/30 text-[#0b2c25] flex items-center gap-3 shadow-xs">
            <span className="size-2 rounded-full bg-[#17664e] shrink-0 animate-ping" />
            <p className="text-sm font-semibold text-[#17664e]">
              Votre zone de recherche a été enregistrée avec succès ! Redirection vers votre profil...
            </p>
          </div>
        )}

        {/* ── COLONNES (Figma 1364:92402) ── */}
        <div className="flex flex-col lg:flex-row gap-[28px] items-start w-full" data-node-id="1364:92402" data-name="Colonnes">
          {/* ── COLONNE GAUCHE : VRAIE CARTE LEAFLET DANS LE CADRE FIGMA (1364:92403) ── */}
          <div
            className="w-full lg:flex-1 h-[816px] bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] overflow-hidden relative shadow-sm"
            data-node-id="1364:92403"
            data-name="Carte carte"
          >
            {/* Barre de recherche flottante en haut de la carte (1364:92707) */}
            <div
              className="absolute top-[20px] left-[20px] right-[20px] max-w-[671px] z-[1000]"
              data-node-id="1364:92707"
            >
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white border border-[#0b2c25] rounded-[14px] h-[48px] px-[16px] flex items-center gap-[10px] shadow-md"
              >
                <img src={figmaSearch} alt="" className="size-[17px] shrink-0 opacity-75" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une ville, une adresse…"
                  className="flex-1 h-full bg-transparent font-normal text-[13px] text-[#0b2c25] placeholder:text-[#0b2c25]/60 focus:outline-none"
                />
                {searching ? (
                  <span className="text-xs text-[#17664e] font-semibold animate-pulse">Recherche...</span>
                ) : (
                  <button
                    type="submit"
                    className="text-xs font-semibold text-white bg-[#0b2c25] hover:bg-[#17664e] px-3 py-1.5 rounded-lg transition"
                  >
                    Chercher
                  </button>
                )}
              </form>
            </div>

            {/* Bouton GPS Me localiser flottant en bas à droite (1364:92711) */}
            <button
              type="button"
              onClick={handleUseGPS}
              disabled={gpsLoading}
              title="Me localiser via GPS"
              className="absolute bottom-[24px] right-[20px] z-[1000] size-[48px] rounded-full bg-white hover:bg-stone-50 border border-[#0b2c25] flex items-center justify-center shadow-lg transition cursor-pointer"
              data-node-id="1364:92711"
            >
              <img
                src={figmaGPSButton}
                alt="Me localiser"
                className={`size-[20px] ${gpsLoading ? 'animate-spin' : ''}`}
              />
            </button>

            {/* VRAIE CARTE INTERACTIVE LEAFLET OPENSTREETMAP */}
            <div className="w-full h-full">
              <MapContainer
                center={[selectedLat, selectedLng]}
                zoom={13}
                zoomControl={false}
                className="w-full h-full"
                style={{ height: '100%', width: '100%', background: '#ebeee1' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController center={[selectedLat, selectedLng]} zoom={13} />
                <MapClickHandler onMapClick={handleMapClick} />

                {/* Cercle dynamique représentant le rayon de recherche (1364:92705) */}
                <Circle
                  center={[selectedLat, selectedLng]}
                  radius={radiusKm * 1000}
                  pathOptions={{
                    color: '#17664e',
                    fillColor: '#17664e',
                    fillOpacity: 0.12,
                    weight: 1.5,
                  }}
                />

                {/* Marqueur de la position de l'utilisateur (1364:92706) */}
                <Marker
                  position={[selectedLat, selectedLng]}
                  icon={createLocationMarkerIcon(selectedLabel)}
                />

                {/* Repères des commerces partenaires de la zone (1364:92691 - 1364:92703) */}
                {SAMPLE_SHOPS.map((shop) => (
                  <Marker
                    key={shop.id}
                    position={[shop.lat, shop.lng]}
                    icon={createShopMarkerIcon(shop.name, shop.isPrimary)}
                  />
                ))}
              </MapContainer>
            </div>
          </div>

          {/* ── COLONNE DROITE : PANNEAU DE CONTRÔLE FIGMA (1364:92713) ── */}
          <div className="w-full lg:w-[380px] flex flex-col gap-[12px] shrink-0" data-node-id="1364:92713" data-name="Panneau">
            {/* 1. SECTION POSITION ENREGISTRÉE (1364:92714) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[18px] flex flex-col gap-[14px] shadow-sm"
              data-node-id="1364:92714"
              data-name="Section Position enregistrée"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="1364:92715" data-name="En-tête de carte">
                <div className="size-[40px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="1364:92716">
                  <img src={figmaPastillePin} alt="" className="size-[20px]" />
                </div>
                <h3 className="font-semibold text-[15px] text-[#0b2c25]" data-node-id="1364:92718">
                  Position enregistrée
                </h3>
              </div>

              <div className="flex items-center gap-[14px] py-[8px] w-full" data-node-id="1364:92719">
                <div className="size-[40px] rounded-[14px] bg-[#0b2c25] flex items-center justify-center shrink-0" data-node-id="1364:92720">
                  <img src={figmaDarkPin} alt="" className="size-[18px]" />
                </div>
                <div className="flex flex-col gap-[2px] flex-1 min-w-0" data-node-id="1364:92722">
                  <p className="font-semibold text-[15px] text-[#0b2c25] truncate" data-node-id="1364:92723">
                    {selectedLabel}
                  </p>
                  <p className="font-normal text-[12px] text-[#0b2c25]/70" data-node-id="1364:92724">
                    Localisation préférée actuelle
                  </p>
                </div>
                <div className="bg-[#dbf0dd] px-[10px] py-[4px] rounded-full shrink-0" data-node-id="1364:92725">
                  <span className="font-medium text-[12px] text-[#17664e]" data-node-id="1364:92726">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SECTION CHOISIR UNE AUTRE LOCALISATION (1364:92727) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[18px] flex flex-col gap-[14px] shadow-sm"
              data-node-id="1364:92727"
              data-name="Section Choisir une autre localisation"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="1364:92728" data-name="En-tête de carte">
                <div className="size-[40px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="1364:92729">
                  <img src={figmaCompassGps} alt="" className="size-[20px]" />
                </div>
                <h3 className="font-semibold text-[15px] text-[#0b2c25]" data-node-id="1364:92731">
                  Autre localisation
                </h3>
              </div>

              <div className="flex flex-col py-[2px] w-full divide-y divide-[#0b2c25]/15" data-node-id="1364:92732">
                {/* Ligne 1 : Utiliser ma position (1364:92733) */}
                <div
                  onClick={handleUseGPS}
                  className="flex items-center gap-[14px] px-[14px] py-[12px] hover:bg-[#fffaf0] rounded-[12px] transition cursor-pointer group"
                  data-node-id="1364:92733"
                >
                  <div className="size-[40px] rounded-[14px] bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="1364:92734">
                    <img src={figmaMyPosPin} alt="" className="size-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0" data-node-id="1364:92736">
                    <p className="font-medium text-[15px] text-[#0b2c25]">
                      Utiliser ma position
                    </p>
                  </div>
                  <span className="font-normal text-[13px] text-[#0b2c25]/80" data-node-id="1364:92738">
                    GPS
                  </span>
                  <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
                </div>

                {/* Ligne 2 : Saisir une adresse (1364:92741) */}
                <div className="flex flex-col">
                  <div
                    onClick={() => setShowAddressInput(!showAddressInput)}
                    className="flex items-center gap-[14px] px-[14px] py-[12px] hover:bg-[#fffaf0] rounded-[12px] transition cursor-pointer group"
                    data-node-id="1364:92741"
                  >
                    <div className="size-[40px] rounded-[14px] bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="1364:92742">
                      <img src={figmaEditPen} alt="" className="size-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0" data-node-id="1364:92744">
                      <p className="font-medium text-[15px] text-[#0b2c25]">
                        Saisir une adresse
                      </p>
                    </div>
                    <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
                  </div>

                  {showAddressInput && (
                    <div className="px-[14px] pb-[12px] pt-1">
                      <form onSubmit={handleSearchSubmit} className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Ex: Rue Didouche Mourad, Alger"
                          className="flex-1 px-3 py-2 text-xs border border-[#0b2c25]/30 rounded-lg focus:outline-none focus:border-[#17664e] bg-[#fffaf0]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-[#0b2c25] text-white text-xs font-semibold rounded-lg hover:bg-[#17664e] transition"
                        >
                          OK
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Ligne 3 : Choisir une ville (1364:92748) */}
                <div className="flex flex-col">
                  <div
                    onClick={() => setShowCitySelect(!showCitySelect)}
                    className="flex items-center gap-[14px] px-[14px] py-[12px] hover:bg-[#fffaf0] rounded-[12px] transition cursor-pointer group"
                    data-node-id="1364:92748"
                  >
                    <div className="size-[40px] rounded-[14px] bg-[#ebeee1] flex items-center justify-center shrink-0 group-hover:bg-[#dbf0dd] transition-colors" data-node-id="1364:92749">
                      <img src={figmaBuildingCity} alt="" className="size-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0" data-node-id="1364:92751">
                      <p className="font-medium text-[15px] text-[#0b2c25]">
                        Choisir une ville
                      </p>
                    </div>
                    <span className="font-normal text-[13px] text-[#0b2c25]/80" data-node-id="1364:92753">
                      Alger
                    </span>
                    <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
                  </div>

                  {showCitySelect && (
                    <div className="px-[14px] pb-[12px] pt-1">
                      <select
                        onChange={(e) => handleSelectWilaya(e.target.value)}
                        defaultValue=""
                        className="w-full px-3 py-2 text-xs border border-[#0b2c25]/30 rounded-lg focus:outline-none focus:border-[#17664e] bg-[#fffaf0] font-medium"
                      >
                        <option value="" disabled>-- Sélectionner une wilaya parmi les 58 --</option>
                        {ALGERIAN_WILAYAS.map((w) => (
                          <option key={w.code} value={w.name}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. SECTION RAYON DE RECHERCHE (1364:92755) */}
            <div
              className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-[18px] flex flex-col gap-[14px] shadow-sm"
              data-node-id="1364:92755"
              data-name="Section Rayon"
            >
              <div className="flex items-center gap-[12px] w-full" data-node-id="1364:92756" data-name="En-tête de carte">
                <div className="size-[40px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0" data-node-id="1364:92757">
                  <img src={figmaCityIcon} alt="" className="size-[20px]" />
                </div>
                <h3 className="font-semibold text-[15px] text-[#0b2c25]" data-node-id="1364:92759">
                  Rayon de recherche
                </h3>
              </div>

              <div className="flex flex-col gap-[12px] w-full" data-node-id="1364:92760" data-name="Rayon">
                <div className="flex items-center justify-between font-poppins text-[14px] text-[#0b2c25]" data-node-id="1364:92761">
                  <span className="font-medium" data-node-id="1364:92762">
                    Distance de recherche
                  </span>
                  <span className="font-semibold" data-node-id="1364:92763">
                    {radiusKm} km
                  </span>
                </div>

                {/* Curseur slider interactif */}
                <div className="relative w-full py-1">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full h-[6px] bg-[#ebeee1] rounded-[3px] accent-[#0b2c25] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between text-[12px] font-normal text-[#0b2c25]/75" data-node-id="1364:92768">
                  <span data-node-id="1364:92769">1 km</span>
                  <span data-node-id="1364:92771">50 km</span>
                </div>
              </div>
            </div>

            {/* 4. ENCADRÉ INFORMATION (1364:92772) */}
            <div
              className="bg-[#eef7ec] border-[1.5px] border-[#dbf0dd] rounded-[20px] px-[16px] py-[14px] flex items-center gap-[12px]"
              data-node-id="1364:92772"
              data-name="Information"
            >
              <img src={figmaInfoCircle} alt="" className="size-[22px] shrink-0" />
              <p className="font-normal text-[12px] text-[#17664e] leading-snug" data-node-id="1364:92774">
                Votre localisation nous aide à vous proposer des offres proches de chez vous. Elle n’est jamais partagée.
              </p>
            </div>

            {/* 5. ACTIONS (1364:92775) */}
            <div className="flex items-center gap-[12px] w-full pt-1" data-node-id="1364:92775" data-name="Actions">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex-1 h-[44px] rounded-[12px] border border-[rgba(0,0,0,0.44)] hover:bg-stone-50 font-semibold text-[13px] text-[#0b2c25] flex items-center justify-center transition cursor-pointer"
                data-node-id="1364:92776"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-[44px] rounded-[12px] bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-[13px] flex items-center justify-center transition cursor-pointer shadow-xs disabled:opacity-50"
                data-node-id="1364:92778"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPage;
