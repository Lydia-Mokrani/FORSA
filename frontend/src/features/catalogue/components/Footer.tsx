// frontend/src/features/catalogue/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Leaf, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                ف
              </div>
              <span className="text-xl font-black text-white">FORSA فرصة</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Plateforme universitaire solidaire luttant contre le gaspillage alimentaire et commercial en Algérie.
              Sauvez des invendus de qualité à prix réduits.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Leaf className="w-4 h-4" />
              <span>Chaque panier compte pour la planète</span>
            </div>
          </div>

          {/* Quick Links Customer */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Pour les Clients</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/explore" className="hover:text-emerald-400 transition">Explorer les paniers</Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-emerald-400 transition">Carte interactive</Link>
              </li>
              <li>
                <Link to="/explore?category=bakeries" className="hover:text-emerald-400 transition">Boulangeries du soir</Link>
              </li>
              <li>
                <Link to="/explore?category=restaurants" className="hover:text-emerald-400 transition">Paniers restaurants</Link>
              </li>
            </ul>
          </div>

          {/* Merchant Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Pour les Commerçants</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/merchant/dashboard" className="hover:text-emerald-400 transition">Tableau de bord</Link>
              </li>
              <li>
                <Link to="/merchant/create-offer" className="hover:text-emerald-400 transition">Publier une offre</Link>
              </li>
              <li>
                <Link to="/merchant/my-offers" className="hover:text-emerald-400 transition">Gérer mon stock</Link>
              </li>
              <li>
                <span className="text-gray-500">Vérification OCR DLUO (MS4)</span>
              </li>
            </ul>
          </div>

          {/* University context & microservices */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Projet Universitaire</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Module Microservices & Génie Logiciel.<br />
              <strong className="text-gray-200">MS2:</strong> Catalogue, Recherche & Gestion du Stock.<br />
              Intégration Consul, RabbitMQ & Traefik.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Architecture certifiée ISO/IEC standard</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 FORSA (فرصة). Tous droits réservés.</p>
          <div className="flex items-center gap-1 text-gray-400">
            <span>Fait avec</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>pour un avenir sans gaspillage</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
