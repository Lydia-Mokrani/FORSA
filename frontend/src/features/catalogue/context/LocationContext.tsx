// frontend/src/features/catalogue/context/LocationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  label: string;
}

interface LocationContextType {
  location: UserLocation;
  setLocation: (loc: UserLocation) => void;
  requestCurrentPosition: () => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  permissionRequested: boolean;
}

const DEFAULT_LOCATION: UserLocation = {
  lat: 36.7725,
  lng: 3.0588,
  label: 'Alger Centre, Alger',
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocationState] = useState<UserLocation>(() => {
    const saved = localStorage.getItem('forsa_user_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_LOCATION;
      }
    }
    return DEFAULT_LOCATION;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const setLocation = (loc: UserLocation) => {
    setLocationState(loc);
    localStorage.setItem('forsa_user_location', JSON.stringify(loc));
  };

  const requestCurrentPosition = async (): Promise<void> => {
    setPermissionRequested(true);
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas supportée par votre navigateur.');
      return;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: 'Ma position actuelle',
          };
          setLocation(newLoc);
          setIsModalOpen(false);
          resolve();
        },
        (err) => {
          console.warn('Geolocation denied or failed', err);
          alert('Impossible de récupérer votre position. Vous pouvez saisir une adresse manuellement.');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        requestCurrentPosition,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        permissionRequested,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
};
