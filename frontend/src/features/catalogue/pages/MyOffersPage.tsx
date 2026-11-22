// frontend/src/features/catalogue/pages/MyOffersPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { Offer, OfferStatus } from '../types';
import { Plus, Edit, Trash2, Eye, Clock, AlertCircle } from 'lucide-react';

export const MyOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const loadOffers = () => {
    setLoading(true);
    CatalogueApi.getMyOffers()
      .then((res) => setOffers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'offre "${name}" ?`)) return;
    try {
      await CatalogueApi.deleteOffer(id);
      setOffers((prev) => prev.filter((o) => o.id !== id));
      alert('Offre supprimée avec succès.');
    } catch (err: any) {
      alert(`Impossible de supprimer l'offre : ${err.message || 'Des réservations sont peut-être en cours.'}`);
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes Offres de Paniers</h1>
          <p className="text-xs text-gray-500 mt-1">
            Gérez vos annonces, consultez le stock disponible et modifiez les prix.
          </p>
        </div>

        <Link
          to="/merchant/create-offer"
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une offre</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'ALL', label: 'Toutes les offres' },
          { key: 'ACTIVE', label: 'Actives' },
          { key: 'PENDING_VERIFICATION', label: 'En attente vérification' },
          { key: 'SOLD_OUT', label: 'Épuisées' },
          { key: 'EXPIRED', label: 'Expirées' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200/70 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredOffers.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-6">Offre</th>
                  <th className="py-3.5 px-4">Prix original / Réduit</th>
                  <th className="py-3.5 px-4">Stock Restant</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Échéance</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 px-6 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                        <img
                          src={offer.photos?.[0]?.url || 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=80'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{offer.name}</div>
                        <div className="text-[11px] text-gray-400 font-normal">
                          {offer.category?.nameFr}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold">
                      <span className="text-emerald-700">{offer.discountedPrice} DA</span>{' '}
                      <span className="text-gray-400 line-through font-normal text-[11px] block">
                        {offer.originalPrice} DA (-{offer.discountPercent}%)
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-gray-800">
                        {offer.quantityAvailable}
                      </span>
                      <span className="text-gray-400 text-[11px]"> / {offer.quantityInitial}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          offer.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : offer.status === 'PENDING_VERIFICATION'
                            ? 'bg-purple-100 text-purple-800'
                            : offer.status === 'SOLD_OUT'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {offer.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-gray-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>
                          {new Date(offer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        to={`/offers/${offer.id}`}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition inline-block"
                        title="Voir la page client"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/merchant/edit-offer/${offer.id}`}
                        className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition inline-block"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(offer.id, offer.name)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition inline-block"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-3">
          <span className="text-4xl">📦</span>
          <h3 className="text-sm font-bold text-gray-900">Aucune offre trouvée dans cette catégorie</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Créez une annonce pour mettre vos invendus à disposition des clients dès aujourd'hui.
          </p>
          <Link
            to="/merchant/create-offer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Publier une offre</span>
          </Link>
        </div>
      )}
    </div>
  );
};
