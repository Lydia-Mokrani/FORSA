import React, { useState } from 'react';
import { X, ShieldCheck, FileText, CheckCircle2, Lock } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  initialTab?: 'cgu' | 'privacy';
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  initialTab = 'cgu',
}) => {
  const [activeTab, setActiveTab] = useState<'cgu' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-poppins text-[#0B2C25]"
      data-node-id="modal-terms-cgu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className="backdrop-blur-[20px] bg-white/95 border-[1.2px] border-[rgba(255,255,255,0.7)] rounded-[28px] max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[85vh] animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[rgba(11,44,37,0.12)] bg-gradient-to-b from-[#eef7ec]/40 to-white/70 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e] shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 id="terms-title" className="font-semibold text-xl text-[#0b2c25]">
                Conditions &amp; Confidentialité FORSA
              </h2>
              <p className="text-xs text-[#0b2c25]/70">
                Engagements contractuels, protection des données et sécurité
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 cursor-pointer p-1.5 rounded-full hover:bg-stone-100 transition"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#dbf0dd] px-6 bg-stone-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('cgu')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'cgu'
                ? 'border-[#17664e] text-[#17664e]'
                : 'border-transparent text-[#0b2c25]/60 hover:text-[#0b2c25]'
            }`}
          >
            <FileText className="size-4" />
            <span>Conditions d'utilisation (CGU)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-[#17664e] text-[#17664e]'
                : 'border-transparent text-[#0b2c25]/60 hover:text-[#0b2c25]'
            }`}
          >
            <Lock className="size-4" />
            <span>Politique de confidentialité (Loi 18-07)</span>
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-[#0b2c25]/85">
          {activeTab === 'cgu' ? (
            <>
              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  1. Objet de la plateforme FORSA
                </h3>
                <p>
                  FORSA est une plateforme numérique algérienne dédiée à la valorisation des invendus et surplus alimentaires. Elle met en relation des commerçants partenaires (boulangeries, pâtisseries, primeurs, superettes) et des consommateurs engagés afin de réduire le gaspillage alimentaire tout en proposant des produits de qualité à prix préférentiel.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  2. Création de compte et Authentification sécurisée
                </h3>
                <p>
                  L’accès aux services FORSA nécessite la création d’un compte personnel via un numéro de mobile algérien (+213) validé par le protocole sécurisé Telegram OTP. L'adresse e-mail fournie est obligatoire pour la traçabilité des réservations, la confirmation de commandes et les procédures de récupération d'urgence. Tout utilisateur s'engage à fournir des informations exactes et sincères.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  3. Engagements du commerçant partenaire
                </h3>
                <p>
                  Tout commerçant professionnel souhaitant publier des offres sur FORSA doit soumettre son registre de commerce, son attestation NIF et une photo de sa devanture. Les produits proposés doivent respecter scrupuleusement les normes d'hygiène et de sécurité sanitaire en vigueur en République Algérienne Démocratique et Populaire.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  4. Réservations, Retrait et Paiement
                </h3>
                <p>
                  Les paniers d’invendus réservés sur FORSA doivent être retirés auprès du commerce partenaire durant la plage horaire définie lors de la commande. Le règlement s'effectue sur place lors du retrait en magasin ou via les moyens de paiement électronique agréés. En cas de non-présentation répétée, FORSA se réserve le droit de suspendre temporairement le compte client.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  5. Suspension et Résiliation
                </h3>
                <p>
                  FORSA applique une politique de tolérance zéro envers la fraude, l'usurpation d'identité et le non-respect des règles sanitaires. Tout compte enfreignant ces règles peut être suspendu ou résilié immédiatement après examen par notre équipe de modération.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  1. Cadre légal et Responsable de traitement
                </h3>
                <p>
                  Conformément aux dispositions de la <strong>Loi n° 18-07 du 10 juin 2018</strong> relative à la protection des personnes physiques dans le traitement des données à caractère personnel, FORSA assure la protection, la confidentialité et l'intégrité de vos informations privées.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  2. Données collectées
                </h3>
                <p>
                  Nous collectons uniquement les données strictement nécessaires au bon fonctionnement de la plateforme : nom complet, numéro de téléphone de contact (+213), adresse e-mail vérifiée, identifiant de discussion Telegram (chiffré), localisation de recherche préférée et historique des réservations.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  3. Non-divulgation et Sécurité des données
                </h3>
                <p>
                  Vos données ne sont jamais vendues, louées ou cédées à des tiers à des fins publicitaires. Les communications et jetons de session (JWT) sont chiffrés selon les standards industriels actuels.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#0b2c25] mb-1">
                  4. Vos droits d'accès, de rectification et d'effacement
                </h3>
                <p>
                  Conformément à la législation algérienne, vous disposez d'un droit permanent d'accès, de rectification, de portabilité et d'effacement de vos données personnelles. Vous pouvez exercer ce droit à tout moment depuis les paramètres de votre compte ou en écrivant à notre délégué à la protection des données : <strong>dpo@forsa.dz</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#dbf0dd] bg-stone-50 flex items-center justify-between">
          <p className="text-2xs text-[#0b2c25]/60">
            Dernière mise à jour : Novembre 2026 · FORSA Algérie
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#0b2c25] hover:bg-stone-200/60 cursor-pointer transition"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-5 py-2.5 rounded-xl bg-[#0b2c25] hover:bg-[#12443a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
            >
              <CheckCircle2 className="size-4" />
              <span>J'ai lu et j'accepte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
