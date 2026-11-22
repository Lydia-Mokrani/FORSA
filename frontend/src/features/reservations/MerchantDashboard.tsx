import React from 'react';

interface MerchantDashboardProps {
  onBack: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ onBack }) => {
  return (
    <div>
      <h2 className="font-poppins font-medium text-lg mb-4">Tableau marchand</h2>
      <p>Interface marchand placeholder.</p>
      <button className="mt-4 px-4 py-2 bg-gray-300 rounded" onClick={onBack}>Retour</button>
    </div>
  );
};
