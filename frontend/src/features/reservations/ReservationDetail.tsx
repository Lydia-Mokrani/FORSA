import React, { useEffect, useState } from 'react';



interface ReservationDetailProps {
  reservationId: string;
  onBack: () => void;
}

export const ReservationDetail: React.FC<ReservationDetailProps> = ({ reservationId, onBack }) => {
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Replace with actual endpoint
        const response = await fetch(`/api/reservations/${reservationId}`, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load reservation');
    }
    const data = await response.json();
        setReservation(data);
      } catch (e: any) {
        setError(e.message || 'Error loading reservation');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reservationId]);

  if (loading) return <p className="text-center">Chargement...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!reservation) return <p>Aucune donnée.</p>;

  return (
    <div>
      <h2 className="font-poppins font-medium text-lg mb-4">Détails de la réservation</h2>
      <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(reservation, null, 2)}</pre>
      <button className="mt-4 px-4 py-2 bg-gray-300 rounded" onClick={onBack}>Retour</button>
    </div>
  );
};
