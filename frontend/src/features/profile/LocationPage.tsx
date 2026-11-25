// frontend/src/features/profile/LocationPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useLocation, UserLocation } from '../catalogue/context/LocationContext';
import { updateUserProfile } from '../auth/services/authService';

// Figma Icons import (exact from Figma 1364:92388 & modals)
import figmaSearch from '../../assets/figma/c65bafca-341b-4fe5-968e-65a0de5bec39.svg';
import figmaGPSButton from '../../assets/figma/e1cc85d5-a256-42a0-9991-7c976cd3b299.svg';
import figmaPastillePin from '../../assets/figma/ea730f30-6ef9-4733-a04b-19e79562dedb.svg';
import figmaDarkPin from '../../assets/figma/0e29a951-8d67-497f-a720-34df5da206e8.svg';
import figmaCompassGps from '../../assets/figma/14bd55d7-da40-4ba7-aca1-855d96e20022.svg';
import figmaMyPosPin from '../../assets/figma/2cb86fc2-63c1-4768-acfb-6e40570e1564.svg';
import figmaArrowRight from '../../assets/figma/182b13de-96de-4db6-ace9-27f8b3452cd5.svg';
import figmaEditPen from '../../assets/figma/ceaa11a0-c7ec-4c45-b400-110118730436.svg';
import figmaBuildingCity from '../../assets/figma/47825d12-022f-4299-b004-e00799788adb.svg';
import figmaCityIcon from '../../assets/figma/3134dacd-de7a-46f4-be2f-9dc4783004a2.svg';
import figmaInfoCircle from '../../assets/figma/39d236e1-c4a7-45f9-b398-1b31b286b216.svg';
import figmaHeaderLocation from '../../assets/figma/1cbde86d-466a-42db-a381-6f1483cf7a01.svg';
import figmaHeaderBell from '../../assets/figma/fdec917d-047b-45c5-a7f0-c4a70094cba6.svg';
import figmaUnreadIndicator from '../../assets/figma/8e948e5b-bcd1-41df-b768-9851ca53ff42.svg';
import figmaPhotoDeProfil from '../../assets/figma/35776968-16f2-47d7-bee8-022b315658ba.png';
import figmaPhotoProduit0 from '../../assets/figma/9f985b2c-fa91-4724-99ad-de6465d66ff9.png';
import figmaPhotoProduit1 from '../../assets/figma/c8d4929e-46fa-4ab0-a413-1ad141bd9461.png';
import figmaPhotoProduit2 from '../../assets/figma/ecfc8b9e-acaa-42b2-ad97-493538b595bb.png';
import figmaPhotoProduit3 from '../../assets/figma/33df1824-d707-421e-a0f5-0d97061d1c67.png';
import figmaPhotoProduit4 from '../../assets/figma/6c55e7fd-90af-4d43-b8e0-7a62de231897.png';

// Modals specific Figma assets
import figmaModalConsentPin from '../../assets/figma/1070b682-452f-4b6d-8190-a480816be200.svg';
import figmaCloseX from '../../assets/figma/ab2fee69-4d19-42c1-89c4-6cdca8df7ba3.svg';
import figmaDeniedWarningPin from '../../assets/figma/3ebeaa76-e7c6-4cb2-9773-2e4e92ef7c96.svg';
import figmaDeniedEditPen from '../../assets/figma/2c3662f1-8d9f-4269-8727-dfc9fa33cae3.svg';
import figmaRefreshIcon from '../../assets/figma/f183b288-aab5-4aed-adfe-1a4da46f1c62.svg';
import figmaAddressModalPin from '../../assets/figma/cb94ec97-e9c6-4f19-a101-6459c9662781.svg';
import figmaInputLocationPin from '../../assets/figma/a0b287b9-9434-4d45-9fd8-c395ff03f35d.svg';
import figmaAlertError from '../../assets/figma/0eaf41cc-1b79-4318-928c-416cadcd99b2.svg';
import figmaSuggestionPin from '../../assets/figma/628bcd92-a04b-41c0-8e28-258c76dcc152.svg';
import figmaTickSave from '../../assets/figma/1f26238d-ee4e-4854-b697-7112b2dd0a6a.svg';
import figmaMapUnavailableDanger from '../../assets/figma/a2cf32b7-5491-4d90-8659-8f51e973a10b.svg';

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

const POPULAR_SUGGESTIONS = [
  { name: 'Alger Centre', lat: 36.7725, lng: 3.0586 },
  { name: 'Bab Ezzouar', lat: 36.7118, lng: 3.1818 },
  { name: 'Hussein Dey', lat: 36.7441, lng: 3.0874 },
  { name: 'Hydra', lat: 36.7439, lng: 3.0389 },
  { name: 'Oran', lat: 35.6987, lng: -0.6349 },
  { name: 'Constantine', lat: 36.3650, lng: 6.6147 },
];

// Commerces partenaires de démonstration sur la carte (Figma 1364:92691 - 1364:92703)
const SAMPLE_SHOPS = [
  { id: 's1', name: 'La Boulangerie', lat: 36.7580, lng: 3.0640, isPrimary: true, photo: figmaPhotoProduit1 },
  { id: 's2', name: 'Pâtisserie Nour', lat: 36.7490, lng: 3.0510, photo: figmaPhotoProduit0 },
  { id: 's3', name: 'Laiterie Atlas', lat: 36.7620, lng: 3.0720, photo: figmaPhotoProduit2 },
  { id: 's4', name: 'Boulangerie du Parc', lat: 36.7440, lng: 3.0610, photo: figmaPhotoProduit4 },
  { id: 's5', name: 'Pâtisserie Rose', lat: 36.7420, lng: 3.0480, photo: figmaPhotoProduit0 },
  { id: 's6', name: 'Épicerie El Baraka', lat: 36.7530, lng: 3.0420, photo: figmaPhotoProduit3 },
];

function createLocationMarkerIcon(label?: string): L.DivIcon {
  const display = label ? (label.length > 25 ? label.slice(0, 22) + '...' : label) : '';
  const labelHtml = display
    ? `<div style="
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        font-family: Poppins, sans-serif;
        font-size: 12px;
        font-weight: 500;
        color: rgba(11, 44, 37, 0.85);
        white-space: nowrap;
        pointer-events: none;
      ">${display}</div>`
    : '';

  return L.divIcon({
    className: 'forsa-user-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        ${labelHtml}
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #286EEB;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 8px rgba(40,110,235,0.4);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function createShopMarkerIcon(name: string, photo: string, isPrimary = false): L.DivIcon {
  if (isPrimary) {
    return L.divIcon({
      className: 'forsa-shop-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="
            background: #0b2c25;
            color: #ffffff;
            font-family: Poppins, sans-serif;
            font-size: 12px;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 10px;
            white-space: nowrap;
            margin-bottom: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          ">${name}</div>
          <div style="
            width: 76px;
            height: 76px;
            border-radius: 38px;
            border: 4px solid #17664e;
            background: #ffffff;
            box-shadow: 0 3px 4px rgba(0,0,0,0.18);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <img src="${photo}" style="width: 62px; height: 62px; border-radius: 31px; object-fit: cover;" alt="${name}" />
          </div>
        </div>
      `,
      iconSize: [80, 110],
      iconAnchor: [40, 85],
    });
  }

  return L.divIcon({
    className: 'forsa-shop-marker',
    html: `
      <div style="
        width: 60px;
        height: 60px;
        border-radius: 30px;
        background: #ffffff;
        box-shadow: 0 3px 4px rgba(0,0,0,0.18);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img src="${photo}" style="width: 50px; height: 50px; border-radius: 25px; object-fit: cover;" alt="${name}" />
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
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

  // Modals state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showMapUnavailableModal, setShowMapUnavailableModal] = useState(false);

  // Address modal form state
  const [modalAddressInput, setModalAddressInput] = useState('');
  const [addressSearchError, setAddressSearchError] = useState(false);
  const [modalAddressSearching, setModalAddressSearching] = useState(false);

  // City modal filter state
  const [cityFilterQuery, setCityFilterQuery] = useState('');

  // Floating search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  const userAvatar = (() => {
    try {
      const cached = localStorage.getItem('forsa_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        const u = parsed.user || parsed;
        return u.avatarUrl || u.photo || null;
      }
    } catch {}
    return null;
  })();

  // Détection GPS effective suite à consentement
  const handleRequestGeolocation = () => {
    setShowConsentModal(false);
    if (!navigator.geolocation) {
      setShowDeniedModal(true);
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
        setShowDeniedModal(true);
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

  // Recherche d'adresse depuis la barre flottante de la carte
  const handleFloatingSearchSubmit = async (e: React.FormEvent) => {
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
        // Ouvre la modale Figma Lieu introuvable préremplie avec l'erreur
        setModalAddressInput(searchQuery.trim());
        setAddressSearchError(true);
        setShowAddressModal(true);
      }
    } catch {
      setShowMapUnavailableModal(true);
    } finally {
      setSearching(false);
    }
  };

  // Recherche depuis la modale "Saisir une adresse"
  const handleModalAddressSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalAddressInput.trim()) return;
    setModalAddressSearching(true);
    setAddressSearchError(false);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          modalAddressInput.trim() + ', Algérie'
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
        setShowAddressModal(false);
        setModalAddressInput('');
      } else {
        setAddressSearchError(true);
      }
    } catch {
      setAddressSearchError(true);
    } finally {
      setModalAddressSearching(false);
    }
  };

  const handleSelectSuggestion = (s: { name: string; lat: number; lng: number }) => {
    setSelectedLat(s.lat);
    setSelectedLng(s.lng);
    setSelectedLabel(`${s.name}, Algérie`);
    setShowAddressModal(false);
    setModalAddressInput('');
    setAddressSearchError(false);
  };

  // Sélection de wilaya
  const handleSelectWilaya = (w: (typeof ALGERIAN_WILAYAS)[0]) => {
    setSelectedLat(w.lat);
    setSelectedLng(w.lng);
    setSelectedLabel(`${w.name}, Algérie`);
    setShowCityModal(false);
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
      }, 1000);
    } catch (err: any) {
      console.error(err);
      navigate('/profile');
    } finally {
      setSaving(false);
    }
  };

  const filteredWilayas = ALGERIAN_WILAYAS.filter(
    (w) =>
      w.name.toLowerCase().includes(cityFilterQuery.toLowerCase().trim()) ||
      w.code.includes(cityFilterQuery.trim())
  );

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

            {/* Circular User Avatar Photo (1364:92401) */}
            <div
              onClick={() => navigate('/profile')}
              className="relative size-[48px] rounded-full overflow-hidden shrink-0 border border-black/5 shadow-xs cursor-pointer hover:opacity-90 transition bg-white"
              data-node-id="1364:92401"
              title="Mon profil"
            >
              <img
                src={userAvatar || figmaPhotoDeProfil}
                alt="Avatar"
                className="size-full object-cover"
              />
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
                onSubmit={handleFloatingSearchSubmit}
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
                    className="text-xs font-semibold text-white bg-[#0b2c25] hover:bg-[#17664e] px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Chercher
                  </button>
                )}
              </form>
            </div>

            {/* Bouton GPS Me localiser flottant en bas à droite (1364:92711) */}
            <button
              type="button"
              onClick={() => setShowConsentModal(true)}
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
                    icon={createShopMarkerIcon(shop.name, shop.photo, shop.isPrimary)}
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

            {/* 2. SECTION CHOISIR UNE AUTRE LOCALISATION (1364:92727) - AUCUN ACCORDÉON INTERNE */}
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
                  onClick={() => setShowConsentModal(true)}
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
                <div
                  onClick={() => {
                    setAddressSearchError(false);
                    setModalAddressInput('');
                    setShowAddressModal(true);
                  }}
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

                {/* Ligne 3 : Choisir une ville (1364:92748) */}
                <div
                  onClick={() => {
                    setCityFilterQuery('');
                    setShowCityModal(true);
                  }}
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
                  <span className="font-normal text-[13px] text-[#0b2c25]/80 max-w-[100px] truncate" data-node-id="1364:92753">
                    {selectedLabel.split(',')[0]}
                  </span>
                  <img src={figmaArrowRight} alt="" className="size-[18px] opacity-70 group-hover:opacity-100 transition" />
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

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALES FIGMA OFFICIELLES (SECTION 1364:94990)
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── MODALE 1 : CONSENTEMENT GÉOLOCALISATION (Figma 1364:93174) ── */}
      {showConsentModal && (
        <div
          onClick={() => setShowConsentModal(false)}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fffaf0] w-full max-w-[480px] rounded-[28px] p-[40px] flex flex-col items-center gap-[16px] shadow-2xl relative"
            data-node-id="1364:93174"
            data-name="Modale consentement"
          >
            {/* Pastille Icône (1364:93175) */}
            <div className="size-[80px] rounded-full bg-[#ebeee1] flex items-center justify-center shrink-0">
              <img src={figmaModalConsentPin} alt="" className="size-[32px]" />
            </div>

            {/* Titre (1364:93177) */}
            <h2 className="font-semibold text-[22px] text-[#0b2c25] text-center leading-snug">
              Autoriser FORSA à utiliser votre position ?
            </h2>

            {/* Description (1364:93178) */}
            <p className="font-normal text-[14px] text-[#0b2c25]/85 text-center leading-relaxed">
              Pour vous montrer les offres près de vous. Votre position n’est jamais partagée avec d’autres utilisateurs.
            </p>

            {/* Bouton Autoriser (1364:93179) */}
            <button
              type="button"
              onClick={handleRequestGeolocation}
              className="w-full h-[48px] bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-[13px] rounded-[10px] flex items-center justify-center transition cursor-pointer shadow-sm mt-2"
              data-node-id="1364:93179"
            >
              Autoriser
            </button>

            {/* Bouton Saisir une adresse (1364:93181) */}
            <button
              type="button"
              onClick={() => {
                setShowConsentModal(false);
                setAddressSearchError(false);
                setModalAddressInput('');
                setShowAddressModal(true);
              }}
              className="w-full h-[48px] border border-[rgba(0,0,0,0.44)] hover:bg-black/5 text-[#0b2c25] font-semibold text-[13px] rounded-[10px] flex items-center justify-center transition cursor-pointer"
              data-node-id="1364:93181"
            >
              Saisir une adresse
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE 2 : CONSENTEMENT REFUSÉ / POSITION NON PARTAGÉE (Figma 1364:93578) ── */}
      {showDeniedModal && (
        <div
          onClick={() => setShowDeniedModal(false)}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-[1.5px] border-[#dbf0dd] w-full max-w-[520px] rounded-[24px] p-[28px] flex flex-col gap-[14px] shadow-2xl relative"
            data-node-id="1364:93578"
            data-name="Modale x"
          >
            {/* Ligne Fermer (1364:93579) */}
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setShowDeniedModal(false)}
                className="size-[36px] rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-stone-50 flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <img src={figmaCloseX} alt="" className="size-[16px]" />
              </button>
            </div>

            {/* Contenu résultat (1364:93582) */}
            <div className="flex flex-col items-center gap-[14px] text-center w-full">
              {/* Pastille warning (1364:93583) */}
              <div className="size-[72px] rounded-full bg-[#fdf3d8] flex items-center justify-center shrink-0">
                <img src={figmaDeniedWarningPin} alt="" className="size-[36px]" />
              </div>

              {/* Titre (1364:93585) */}
              <h2 className="font-semibold text-[18px] text-[#0b2c25]">
                Position non partagée
              </h2>

              {/* Description (1364:93586) */}
              <p className="font-medium text-[14px] text-[#0b2c25]/85 leading-relaxed">
                Aucune position n’a été collectée. Saisissez une adresse, ou autorisez la localisation dans les réglages de votre navigateur.
              </p>

              {/* Actions (1364:93587) */}
              <div className="flex flex-col gap-[10px] w-full pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeniedModal(false);
                    setAddressSearchError(false);
                    setModalAddressInput('');
                    setShowAddressModal(true);
                  }}
                  className="w-full h-[48px] bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  data-node-id="1364:93588"
                >
                  <img src={figmaDeniedEditPen} alt="" className="size-[18px]" />
                  <span>Saisir une adresse</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestGeolocation}
                  className="w-full h-[48px] border border-[#0b2c25] hover:bg-stone-50 text-[#0b2c25] font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 transition cursor-pointer"
                  data-node-id="1364:93591"
                >
                  <img src={figmaRefreshIcon} alt="" className="size-[18px]" />
                  <span>Réessayer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE 3 : SAISIR UNE ADRESSE / LIEU INTROUVABLE (Figma 1364:93989) ── */}
      {showAddressModal && (
        <div
          onClick={() => setShowAddressModal(false)}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-[1.5px] border-[#dbf0dd] w-full max-w-[520px] rounded-[24px] p-[28px] flex flex-col gap-[20px] shadow-2xl relative"
            data-node-id="1364:93989"
            data-name="Modale Saisir une adresse"
          >
            {/* En-tête (1364:93990) */}
            <div className="flex items-start gap-[14px] w-full">
              <div className="size-[48px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                <img src={figmaAddressModalPin} alt="" className="size-[24px]" />
              </div>
              <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                <h2 className="font-semibold text-[18px] text-[#0b2c25] leading-tight" data-node-id="1364:93994">
                  Saisir une adresse
                </h2>
                <p className="font-normal text-[12px] text-[#0b2c25]/75" data-node-id="1364:93995">
                  Indiquez une ville ou une adresse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="size-[36px] rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-stone-50 flex items-center justify-center shrink-0 transition cursor-pointer"
                title="Fermer"
              >
                <img src={figmaCloseX} alt="" className="size-[16px]" />
              </button>
            </div>

            {/* Champ Ville ou adresse (1364:93998) */}
            <div className="flex flex-col gap-[6px] w-full" data-node-id="1364:93998">
              <label className="font-semibold text-[12px] text-[#0b2c25]">
                Ville ou adresse
              </label>
              <form onSubmit={handleModalAddressSubmit} className="w-full">
                <div
                  className={`bg-white border-[1.5px] ${
                    addressSearchError ? 'border-[#b13b3b]' : 'border-[#0b2c25]'
                  } rounded-[12px] h-[48px] px-[14px] flex items-center gap-[10px] w-full transition-colors`}
                  data-node-id="1364:94000"
                >
                  <img src={figmaInputLocationPin} alt="" className="size-[18px] shrink-0" />
                  <input
                    type="text"
                    value={modalAddressInput}
                    onChange={(e) => {
                      setModalAddressInput(e.target.value);
                      if (addressSearchError) setAddressSearchError(false);
                    }}
                    placeholder="Ex: Alger centre, Bab Ezzouar, Oran..."
                    className="flex-1 h-full bg-transparent font-medium text-[14px] text-[#0b2c25] placeholder:text-[#0b2c25]/50 focus:outline-none"
                    autoFocus
                  />
                  {modalAddressSearching && (
                    <span className="text-xs text-[#17664e] font-semibold animate-pulse">Recherche...</span>
                  )}
                </div>
              </form>

              {/* Message d'aide / erreur (1364:94003) */}
              {addressSearchError && (
                <div className="flex items-center gap-[6px] pt-1" data-node-id="1364:94003">
                  <img src={figmaAlertError} alt="" className="size-[14px] shrink-0" />
                  <p className="font-normal text-[11px] text-[#b13b3b]" data-node-id="1364:94005">
                    Aucun lieu ne correspond à votre saisie. Vérifiez l’orthographe.
                  </p>
                </div>
              )}
            </div>

            {/* Suggestions (1364:94006) */}
            <div
              className="bg-[#fffaf0] border border-[#e8ebdf] rounded-[16px] px-[16px] py-[8px] flex flex-col w-full"
              data-node-id="1364:94006"
            >
              <p className="font-semibold text-[11px] text-[#0b2c25] py-1" data-node-id="1364:94007">
                Villes proches
              </p>
              <div className="flex flex-col divide-y divide-[#0b2c25]/10">
                {POPULAR_SUGGESTIONS.map((s) => (
                  <div
                    key={s.name}
                    onClick={() => handleSelectSuggestion(s)}
                    className="flex items-center gap-[10px] py-[10px] hover:text-[#17664e] hover:bg-black/5 rounded-lg px-2 -mx-2 transition cursor-pointer group"
                  >
                    <img src={figmaSuggestionPin} alt="" className="size-[16px] shrink-0 opacity-80 group-hover:opacity-100" />
                    <span className="font-medium text-[14px] text-[#0b2c25] group-hover:text-[#17664e]">
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions (1364:94017) */}
            <div className="flex items-center justify-end gap-[12px] w-full pt-1" data-node-id="1364:94017">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="h-[45px] px-[20px] rounded-[12px] border border-[#0b2c25] hover:bg-stone-50 font-semibold text-[14px] text-[#0b2c25] flex items-center justify-center transition cursor-pointer"
                data-node-id="1364:94018"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => handleModalAddressSubmit()}
                disabled={modalAddressSearching || !modalAddressInput.trim()}
                className={`h-[45px] px-[20px] rounded-[12px] bg-[#0b2c25] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                  !modalAddressInput.trim() ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#17664e]'
                }`}
                data-node-id="1364:94020"
              >
                <img src={figmaTickSave} alt="" className="size-[18px]" />
                <span>Enregistrer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE 4 : CHOISIR UNE VILLE (SÉLECTION DES 58 WILAYAS D'ALGÉRIE) ── */}
      {showCityModal && (
        <div
          onClick={() => setShowCityModal(false)}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-[1.5px] border-[#dbf0dd] w-full max-w-[560px] max-h-[85vh] rounded-[24px] p-[28px] flex flex-col gap-[18px] shadow-2xl relative"
          >
            {/* En-tête */}
            <div className="flex items-start gap-[14px] w-full">
              <div className="size-[48px] rounded-full bg-[#eef7ec] border border-[#235347] flex items-center justify-center shrink-0">
                <img src={figmaBuildingCity} alt="" className="size-[22px]" />
              </div>
              <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                <h2 className="font-semibold text-[18px] text-[#0b2c25] leading-tight">
                  Choisir une ville
                </h2>
                <p className="font-normal text-[12px] text-[#0b2c25]/75">
                  Sélectionnez votre wilaya parmi les 58 wilayas d’Algérie.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCityModal(false)}
                className="size-[36px] rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-stone-50 flex items-center justify-center shrink-0 transition cursor-pointer"
                title="Fermer"
              >
                <img src={figmaCloseX} alt="" className="size-[16px]" />
              </button>
            </div>

            {/* Champ de recherche rapide de wilaya */}
            <div className="bg-[#fffaf0] border border-[#0b2c25]/30 rounded-[12px] h-[44px] px-[14px] flex items-center gap-[10px] w-full">
              <img src={figmaSearch} alt="" className="size-[16px] shrink-0 opacity-70" />
              <input
                type="text"
                value={cityFilterQuery}
                onChange={(e) => setCityFilterQuery(e.target.value)}
                placeholder="Filtrer par nom ou numéro (ex: 16 ou Alger)..."
                className="flex-1 h-full bg-transparent font-medium text-[13px] text-[#0b2c25] placeholder:text-[#0b2c25]/50 focus:outline-none"
                autoFocus
              />
              {cityFilterQuery && (
                <button
                  type="button"
                  onClick={() => setCityFilterQuery('')}
                  className="text-xs text-[#0b2c25]/60 hover:text-[#0b2c25]"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Liste scrollable des wilayas */}
            <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 flex flex-col gap-1.5 divide-y divide-[#0b2c25]/10">
              {filteredWilayas.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#0b2c25]/60">
                  Aucune wilaya ne correspond à « {cityFilterQuery} »
                </div>
              ) : (
                filteredWilayas.map((w) => {
                  const isSelected = selectedLabel.toLowerCase().includes(w.name.toLowerCase());
                  return (
                    <div
                      key={w.code}
                      onClick={() => handleSelectWilaya(w)}
                      className={`flex items-center justify-between px-[14px] py-[10px] rounded-[10px] cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#eef7ec] text-[#17664e] font-semibold'
                          : 'hover:bg-[#fffaf0] text-[#0b2c25]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#17664e] bg-[#dbf0dd] px-2 py-0.5 rounded-md min-w-[28px] text-center">
                          {w.code}
                        </span>
                        <span className="text-[14px] font-medium">{w.name}</span>
                      </div>
                      {isSelected && (
                        <img src={figmaTickSave} alt="Selected" className="size-[16px]" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-[12px] w-full pt-2 border-t border-[#0b2c25]/10">
              <button
                type="button"
                onClick={() => setShowCityModal(false)}
                className="h-[42px] px-[20px] rounded-[12px] border border-[#0b2c25] hover:bg-stone-50 font-semibold text-[13px] text-[#0b2c25] flex items-center justify-center transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE 5 : SERVICE DE CARTES INDISPONIBLE (Figma 1364:94418) ── */}
      {showMapUnavailableModal && (
        <div
          onClick={() => setShowMapUnavailableModal(false)}
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-[1.5px] border-[#dbf0dd] w-full max-w-[520px] rounded-[24px] p-[28px] flex flex-col gap-[14px] shadow-2xl relative"
            data-node-id="1364:94418"
            data-name="Modale x"
          >
            {/* Ligne Fermer (1364:94419) */}
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setShowMapUnavailableModal(false)}
                className="size-[36px] rounded-full border-[1.5px] border-[#e8ebdf] hover:bg-stone-50 flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <img src={figmaCloseX} alt="" className="size-[16px]" />
              </button>
            </div>

            {/* Contenu (1364:94422) */}
            <div className="flex flex-col items-center gap-[14px] text-center w-full">
              <div className="size-[72px] rounded-full bg-[#f7dcd8] flex items-center justify-center shrink-0">
                <img src={figmaMapUnavailableDanger} alt="" className="size-[36px]" />
              </div>

              <h2 className="font-semibold text-[18px] text-[#0b2c25]">
                Service de cartes indisponible
              </h2>

              <p className="font-medium text-[14px] text-[#0b2c25]/85 leading-relaxed">
                Le service est momentanément indisponible ou sa limite d’utilisation est atteinte. Les offres restent consultables sans la carte.
              </p>

              <div className="flex flex-col gap-[10px] w-full pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMapUnavailableModal(false);
                    handleFloatingSearchSubmit({ preventDefault: () => {} } as any);
                  }}
                  className="w-full h-[48px] bg-[#0b2c25] hover:bg-[#17664e] text-white font-semibold text-[14px] rounded-[12px] flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  data-node-id="1364:94428"
                >
                  <img src={figmaRefreshIcon} alt="" className="size-[18px]" />
                  <span>Réessayer plus tard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMapUnavailableModal(false)}
                  className="w-full h-[48px] border border-[#0b2c25] hover:bg-stone-50 text-[#0b2c25] font-semibold text-[14px] rounded-[12px] flex items-center justify-center transition cursor-pointer"
                  data-node-id="1364:94431"
                >
                  <span>Fermer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPage;
