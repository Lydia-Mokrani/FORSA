import React from 'react';

interface ReservationSuccessProps {
  onBack: () => void;
}

export const ReservationSuccess: React.FC<ReservationSuccessProps> = ({ onBack }) => {
  return (
    <div className="text-center">
      <h2 className="font-poppins font-medium text-lg mb-4">Réservation créée avec succès</h2>
      <p>Votre réservation a été enregistrée.</p>
      <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Retour à la liste
      </button>
    </div>
  );
};
