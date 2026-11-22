import React, { useState } from 'react';

interface CreateReservationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateReservationForm: React.FC<CreateReservationFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Replace with real endpoint
      await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date }),
      });
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-poppins font-medium text-lg">Créer une réservation</h2>
      <div>
        <label className="block mb-1" htmlFor="name">Nom</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
      </div>
      <div>
        <label className="block mb-1" htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded p-2"
          required
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'En cours...' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};
