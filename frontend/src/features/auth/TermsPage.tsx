import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'privacy' ? 'privacy' : 'cgu';
  const [activeTab, setActiveTab] = useState<'cgu' | 'privacy'>(initialTab);

  return (
    <div className="min-h-screen bg-[#FFFAF0] font-poppins text-[#0B2C25] py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation retour */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#0b2c25] hover:text-[#17664e] transition cursor-pointer bg-white px-3.5 py-2 rounded-full border border-[#dbf0dd] shadow-2xs"
          >
            <ArrowLeft className="size-4" />
            <span>Retour</span>
          </button>

          <Link
            to="/register"
            className="text-xs font-semibold text-[#17664e] hover:underline"
          >
            Créer un compte FORSA →
          </Link>
        </div>

        {/* Card principale */}
        <div className="bg-white border-[1.5px] border-[#dbf0dd] rounded-[24px] p-6 sm:p-10 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="size-12 rounded-full bg-[#eef7ec] border border-[#dbf0dd] flex items-center justify-center text-[#17664e] shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="font-semibold text-2xl sm:text-3xl text-[#0b2c25]">
                Conditions &amp; Confidentialité
              </h1>
              <p className="text-xs text-[#0b2c25]/70 mt-0.5">
                FORSA Algérie · Cadre légal et contractuel
              </p>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex border-b border-[#dbf0dd] mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('cgu')}
              className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'cgu'
                  ? 'border-[#17664e] text-[#17664e]'
                  : 'border-transparent text-[#0b2c25]/60 hover:text-[#0b2c25]'
              }`}
            >
              <FileText className="size-4" />
              <span>Conditions Générales d'Utilisation (CGU)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'privacy'
                  ? 'border-[#17664e] text-[#17664e]'
                  : 'border-transparent text-[#0b2c25]/60 hover:text-[#0b2c25]'
              }`}
            >
              <Lock className="size-4" />
              <span>Politique de confidentialité (Loi 18-07)</span>
            </button>
          </div>

          {/* Contenu */}
          <div className="space-y-6 text-sm text-[#0b2c25]/85 leading-relaxed">
            {activeTab === 'cgu' ? (
              <>
                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    1. Présentation de la plateforme
                  </h2>
                  <p>
                    FORSA est une plateforme numérique innovante opérant en Algérie, conçue pour lutter contre le gaspillage alimentaire en facilitant la mise en relation directe entre commerces de proximité (boulangeries, pâtisseries, primeurs, superettes) et consommateurs.
                  </p>
                </section>

                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    2. Inscription et Sécurité des comptes
                  </h2>
                  <p>
                    La création de compte est sécurisée par le protocole Telegram OTP. Chaque utilisateur doit fournir un numéro de mobile algérien (+213) valide et une adresse e-mail vérifiée. Les identifiants sont strictement personnels et ne doivent jamais être partagés.
                  </p>
                </section>

                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    3. Engagements des Commerçants
                  </h2>
                  <p>
                    Chaque commerçant s'engage à proposer exclusivement des produits sains, propres à la consommation et conformes aux règles d'hygiène et de sécurité sanitaire. Les justificatifs administratifs (Registre de commerce, NIF, Devanture) doivent être vérifiés et approuvés avant publication d'offres.
                  </p>
                </section>

                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    4. Réservations et Retraits
                  </h2>
                  <p>
                    Les paniers réservés doivent être retirés durant les créneaux horaires spécifiés par le commerçant. En cas d'empêchement, le client doit annuler sa réservation dans les délais impartis pour permettre la réattribution des invendus.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    1. Conformité à la Loi 18-07
                  </h2>
                  <p>
                    Le traitement de vos données personnelles est effectué dans le respect le plus strict des dispositions de la <strong>Loi n° 18-07 du 10 juin 2018</strong> relative à la protection des personnes physiques dans le traitement des données à caractère personnel en Algérie.
                  </p>
                </section>

                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    2. Finalité de la collecte
                  </h2>
                  <p>
                    Les données personnelles sont collectées exclusivement pour l'exécution des commandes, la notification des réservations, la sécurité des accès et l'assistance utilisateur.
                  </p>
                </section>

                <section>
                  <h2 className="font-semibold text-base text-[#0b2c25] mb-2">
                    3. Vos Droits
                  </h2>
                  <p>
                    Vous disposez d'un droit permanent d'accès, d'opposition, de rectification et de suppression de vos données. Pour exercer ce droit, écrivez à : <strong>dpo@forsa.dz</strong>.
                  </p>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
