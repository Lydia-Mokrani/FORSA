import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export const MerchantEditProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: 'Maison Gourmande',
    activityType: 'Boulangerie – Pâtisserie',
    wilaya: 'Boumerdès',
    commune: 'Boumerdès',
    address: '12 Rue des Fleurs, Boumerdès',
    phone: '+213 555 12 34 56',
    openingHours: '8h00 – 20h00',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => {
      navigate('/merchant/account');
    }, 1200);
  };

  return (
    <div
      className="max-w-4xl mx-auto pb-16 font-poppins text-[#0B2C25]"
      data-node-id="1186:21473"
      data-name="Desktop · Mon compte — Modifier le profil"
    >
      {/* Fil d'ariane & En-tête */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/merchant/account')}
          className="inline-flex items-center gap-1.5 text-xs text-[#0b2c25]/70 hover:text-[#0b2c25] mb-2 cursor-pointer transition-colors"
          data-node-id="1186:21498"
        >
          <ArrowLeft className="size-3.5" />
          <span>Mon espace / Mon compte / Modifier le profil</span>
        </button>

        <h1 className="font-semibold text-3xl sm:text-4xl text-[#0b2c25]" data-node-id="1186:21499">
          Modifier le profil
        </h1>
        <p className="text-base text-[#0b2c25]/75 mt-1" data-node-id="1186:21500">
          Présentez votre commerce et sa localisation
        </p>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-[#eef7ec] border border-[#dbf0dd] text-[#17664e] flex items-center gap-3 animate-fade-in">
          <Check className="size-5 shrink-0" />
          <p className="font-medium text-sm">Modifications enregistrées avec succès ! Redirection en cours...</p>
        </div>
      )}

      {/* Formulaire Carte */}
      <form onSubmit={handleSubmit} className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
          <div className="size-10 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e]">
            <Building className="size-5" />
          </div>
          <h2 className="font-medium text-xl text-[#0b2c25]">
            Informations du commerce
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Nom du commerce *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Type d'activité *
            </label>
            <input
              type="text"
              required
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Numéro de téléphone *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Wilaya *
            </label>
            <input
              type="text"
              required
              value={formData.wilaya}
              onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Commune *
            </label>
            <input
              type="text"
              required
              value={formData.commune}
              onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Adresse complète *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0b2c25] mb-1.5">
              Horaires d'ouverture *
            </label>
            <input
              type="text"
              required
              value={formData.openingHours}
              onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
              placeholder="ex. 8h00 – 20h00"
              className="w-full h-12 px-4 rounded-xl border border-[#dbf0dd] focus:border-[#17664e] focus:ring-2 focus:ring-[#17664e]/20 outline-none text-sm transition-all"
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-stone-100">
          <button
            type="button"
            onClick={() => navigate('/merchant/account')}
            className="px-6 py-3 rounded-xl border-[1.5px] border-[#0b2c25] text-[#0b2c25] text-sm font-medium hover:bg-stone-50 cursor-pointer transition-all"
            data-node-id="1186:21568"
          >
            Annuler
          </button>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            data-node-id="1186:21570"
          >
            <Check className="size-4" />
            <span>Enregistrer les modifications</span>
          </button>
        </div>
      </form>
    </div>
  );
};
