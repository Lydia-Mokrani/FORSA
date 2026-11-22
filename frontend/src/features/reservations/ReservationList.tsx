import React from 'react';

interface ReservationListProps {
  onSelect: (id: string) => void;
  onCreate: () => void;
  onMerchant: () => void;
}

export const ReservationList: React.FC<ReservationListProps> = ({ onSelect, onCreate, onMerchant }) => {
  // Placeholder data
  const reservations = [
    { id: '1', title: 'Reservation 1' },
    { id: '2', title: 'Reservation 2' },
  ];
  return (
    <div>
      <h2 className="font-poppins font-medium text-lg mb-4">Mes réservations</h2>
      <ul className="space-y-2 mb-4">
        {reservations.map((r) => (
          <li
            key={r.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => onSelect(r.id)}
          >
            {r.title}
          </li>
        ))}
      </ul>
      <button
        className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
        onClick={onCreate}
      >
        Créer une réservation
      </button>
      <button
        className="px-4 py-2 bg-green-500 text-white rounded"
        onClick={onMerchant}
      >
        Tableau marchand
      </button>
    </div>
  );
};
