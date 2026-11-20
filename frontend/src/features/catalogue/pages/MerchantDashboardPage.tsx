// frontend/src/features/catalogue/pages/MerchantDashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CatalogueApi } from '../services/api';
import { MerchantDashboardData } from '../types';
import {
  PackageCheck,
  Clock,
  AlertTriangle,
  Store,
  Plus,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  Eye,
  FileCheck,
  Star,
} from 'lucide-react';

export const MerchantDashboardPage: React.FC = () => {
  const [data, setData] = useState<MerchantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CatalogueApi.getMerchantDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, recentOffers, shops } = data;

  const statCards = [
    {
      title: 'Offres Actives',
      value: stats.activeOffers,
      icon: PackageCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Réservations en cours',
      value: stats.reservedProducts,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Commandes Récupérées',
      value: stats.pickups,
      icon: CheckCircle,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'En attente OCR (MS4)',
      value: stats.pendingVerification,
      icon: FileCheck,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Espace Commerçant • MS2 Catalogue & Stocks
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">
            Tableau de Bord Commerçant
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Gérez vos surplus alimentaires, suivez les réservations et réduisez le gaspillage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/merchant/create-offer"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une nouvelle offre</span>
          </Link>
          <Link
            to="/merchant/my-offers"
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs transition"
          >
            Toutes mes offres
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-3xl border bg-white shadow-xs space-y-3 transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{c.title}</span>
                <div className={`p-2.5 rounded-xl border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900">{c.value}</div>
            </div>
          );
        })}
      </div>

      {/* Grid: Recent Offers + Shop Snapshot Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Offers Feed (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-gray-900">Activité récente de vos offres</h3>
            <Link
              to="/merchant/my-offers"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Voir tout ({stats.totalOffers}) &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Produit</th>
                  <th className="pb-3">Prix</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Échéance</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-base">{offer.category?.icon || '🛍️'}</span>
                      <span className="truncate max-w-[200px]">{offer.name}</span>
                    </td>
                    <td className="py-3 font-bold text-emerald-700">
                      {offer.discountedPrice} DA{' '}
                      <span className="text-[10px] text-amber-600">(-{offer.discountPercent}%)</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3 text-gray-500">
                      {new Date(offer.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Link
                        to={`/offers/${offer.id}`}
                        className="text-gray-400 hover:text-emerald-600 font-semibold"
                        title="Voir la page publique"
                      >
                        Aperçu
                      </Link>
                      <Link
                        to={`/merchant/edit-offer/${offer.id}`}
                        className="text-emerald-600 hover:text-emerald-800 font-semibold"
                      >
                        Modifier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shop Snapshot & Sync Status (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Snapshot du Commerce (MS1 Sync)</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Données synchronisées en temps réel via RabbitMQ
            </p>
          </div>

          {shops.map((shop) => (
            <div key={shop.id} className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900">{shop.name}</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  {shop.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{shop.address}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Note moyenne</span>
                  <div className="flex items-center gap-1 font-bold text-gray-800">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{shop.averageRating.toFixed(1)} / 5</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Ventes totales</span>
                  <span className="font-bold text-gray-800">{shop.salesCount} paniers</span>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Guidance Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 space-y-2">
            <h5 className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>💡</span>
              <span>Conseil anti-gaspi</span>
            </h5>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              Publiez vos invendus alimentaires vers 16h30 pour permettre aux clients de réserver et récupérer
              leurs paniers avant votre heure de fermeture habituelle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
