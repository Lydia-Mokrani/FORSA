import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Lock, Phone, AlertCircle, ArrowRight } from 'lucide-react';
import loginBg from '../../assets/login-bg.png';
import checkmarkIcon from '../../assets/icons/checkmark-circle-02.svg';
import arrowRightIcon from '../../assets/icons/arrow-right.svg';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import uploadIcon from '../../assets/icons/upload-01.svg';
import infoCircleIcon from '../../assets/icons/information-circle.svg';
import inputStoreIcon from '../../assets/icons/input-store.svg';
import inputChevronDownIcon from '../../assets/icons/input-chevron-down.svg';
import inputFileTextIcon from '../../assets/icons/input-file-text.svg';
import inputPinIcon from '../../assets/icons/input-pin-location.svg';
import inputUserIcon from '../../assets/icons/input-user.svg';
import inputMailIcon from '../../assets/icons/input-mail.svg';
import inputPhoneIcon from '../../assets/icons/input-phone.svg';
import inputLockIcon from '../../assets/icons/input-lock.svg';
import inputEyeIcon from '../../assets/icons/input-eye.svg';
import badgeRoleIcon from '../../assets/icons/badge-role-icon.svg';
import clockPendingIcon from '../../assets/icons/illustration-clock-pending.svg';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'merchant' ? 'MERCHANT' : 'CUSTOMER';
  const initialStep = (Number(searchParams.get('step')) as 1 | 2 | 3 | 4) || 1;

  const [role, setRole] = useState<'CUSTOMER' | 'MERCHANT'>(initialRole);
  const [merchantStep, setMerchantStep] = useState<1 | 2 | 3 | 4>(initialStep);

  // Client form states
  const [clientData, setClientData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    acceptTerms: false,
  });

  // Merchant form states (Steps 1, 2, 3)
  const [merchantData, setMerchantData] = useState({
    // Étape 1 : Compte
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    // Étape 2 : Commerce
    shopName: '',
    category: 'Boulangerie & Pâtisserie',
    rcNumber: '',
    address: '',
    latitude: 36.7588, // Boumerdès par défaut
    longitude: 3.4756,
    // Étape 3 : Documents
    commercialRegisterFile: null as File | null,
    taxIdFile: null as File | null,
    storefrontFile: null as File | null,
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientPhoneError, setClientPhoneError] = useState<string | null>(null);
  const [merchantPhoneError, setMerchantPhoneError] = useState<string | null>(null);
  const [showMerchantPassword, setShowMerchantPassword] = useState(false);

  // Soumission de l'inscription Client (Figma Frame 08)
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData.acceptTerms) {
      setErrorMessage('Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.');
      return;
    }

    const rawPhone = clientData.phone.replace(/[\s.\-()]/g, '');
    const phoneDigits = rawPhone.replace(/^(\+213|00213|213|0)/, '');
    const isValidAlgerianPhone = /^[567]\d{8}$/.test(phoneDigits);

    if (!isValidAlgerianPhone) {
      setClientPhoneError('Numéro de téléphone incorrect.');
      return;
    }

    setClientPhoneError(null);
    setErrorMessage(null);
    setLoading(true);

    try {
      const phoneToSend = `+213${phoneDigits}`;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: clientData.fullName,
          email: clientData.email,
          phone: phoneToSend,
          password: clientData.password,
          role: 'CUSTOMER',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Erreur lors de l’inscription.');
      }

      // Stocker le token
      if (data.accessToken) {
        localStorage.setItem('forsa_access_token', data.accessToken);
        localStorage.setItem('forsa_user', JSON.stringify(data.user));
      }

      // Rediriger vers la vérification de l'e-mail
      navigate(`/verify-email?email=${encodeURIComponent(clientData.email)}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur réseau lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  // Soumission de l'inscription Commerçant (Étape 3 -> Frame 12)
  const handleMerchantFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantData.acceptTerms) {
      setErrorMessage('Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      const rawPhone = merchantData.phone.replace(/[\s.\-()]/g, '');
      const phoneDigits = rawPhone.replace(/^(\+213|00213|213|0)/, '');
      const phoneToSend = `+213${phoneDigits}`;

      // 1. Inscription du compte utilisateur Commerçant
      const authRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: merchantData.ownerName,
          email: merchantData.email,
          phone: phoneToSend,
          password: merchantData.password,
          role: 'MERCHANT',
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData?.error?.message || 'Échec de création du compte.');

      const token = authData.accessToken;
      localStorage.setItem('forsa_access_token', token);

      // 2. Création de la boutique
      const shopRes = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: merchantData.shopName,
          description: `Commerce dans la catégorie ${merchantData.category} (RC: ${merchantData.rcNumber})`,
          address: merchantData.address,
          latitude: merchantData.latitude,
          longitude: merchantData.longitude,
          phone: merchantData.phone,
        }),
      });
      const shopData = await shopRes.json();
      if (!shopRes.ok) throw new Error(shopData?.error?.message || 'Échec de création de la boutique.');

      // 3. Téléversement des 3 pièces justificatives (si fournies)
      if (merchantData.commercialRegisterFile || merchantData.taxIdFile || merchantData.storefrontFile) {
        const formData = new FormData();
        if (merchantData.commercialRegisterFile) formData.append('commercial_register', merchantData.commercialRegisterFile);
        if (merchantData.taxIdFile) formData.append('tax_id', merchantData.taxIdFile);
        if (merchantData.storefrontFile) formData.append('storefront', merchantData.storefrontFile);

        await fetch('/api/shops/my/documents', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Passer à l'écran de confirmation (Frame 12)
      setMerchantStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l’envoi de votre dossier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-4 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white overflow-x-hidden">
      {/* Fond photo officiel Figma (Image bokeh feuille verte + overlay #FFFAF0 à 28%) */}
      <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img src={loginBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#FFFAF0]/28" />
      </div>

      {/* En-tête officiel Figma */}
      <header className="relative z-10 w-full max-w-6xl flex items-center justify-between mb-8 px-2 sm:px-4">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="hidden sm:inline text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte Glassmorphism (520px de large, padding 48px, rounded 32px comme Figma) */}
      <main className="relative z-10 w-full max-w-[520px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-12 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 sm:gap-6 my-auto">
        
        {/* Toggle Client / Commerçant (sauf à l'étape finale) */}
        {merchantStep !== 4 && (
          <div className="flex items-center justify-center w-full">
            <button
              type="button"
              onClick={() => {
                setRole((r) => (r === 'CUSTOMER' ? 'MERCHANT' : 'CUSTOMER'));
                setMerchantStep(1);
                setErrorMessage(null);
              }}
              className="group inline-flex items-center gap-2 bg-white/65 hover:bg-white/85 border border-[#0B2C25]/20 px-3.5 py-1.5 rounded-full transition shadow-sm"
            >
              <img src={badgeRoleIcon} alt="" className="w-4 h-4" />
              <span className="text-xs sm:text-[13px] font-medium text-[#0B2C25]">
                {role === 'CUSTOMER' ? 'Espace client' : 'Espace commerçant'}
              </span>
              <span className="text-xs text-[#0B2C25]/40">·</span>
              <span className="text-xs sm:text-[13px] font-medium text-[#17664E] group-hover:underline">Changer</span>
            </button>
          </div>
        )}

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-800 text-xs sm:text-sm px-4 py-3 rounded-xl animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ─── CAS 1 : INSCRIPTION CLIENT (Frame 08) ─── */}
        {role === 'CUSTOMER' && (
          <>
            <div className="text-center flex flex-col gap-1.5">
              <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25]">
                Créer un compte client
              </h1>
              <p className="text-xs sm:text-[15px] text-[#0B2C25]/65">
                Réservez des produits à prix réduit près de chez vous
              </p>
            </div>

            <form onSubmit={handleClientSubmit} className="flex flex-col gap-3.5 sm:gap-4">
              <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                <User className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                <input
                  type="text"
                  required
                  placeholder="Nom complet"
                  value={clientData.fullName}
                  onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                  className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none"
                />
              </div>

              <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                <Mail className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                <input
                  type="email"
                  required
                  placeholder="Adresse e-mail"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div
                  className={`flex items-center bg-white/65 border-[1.2px] rounded-[14px] h-14 px-4 transition ${
                    clientPhoneError
                      ? 'border-[#B22222] bg-[#B22222]/5'
                      : 'border-white/95 focus-within:border-[#17664E]'
                  }`}
                >
                  <Phone className={`w-5 h-5 mr-2.5 shrink-0 ${clientPhoneError ? 'text-[#B22222]' : 'text-[#0B2C25]/50'}`} />
                  <span className="text-[#0B2C25] font-semibold text-sm sm:text-[15px] select-none mr-2">
                    +213
                  </span>
                  <input
                    type="tel"
                    placeholder="6 61 45 17 40"
                    value={clientData.phone}
                    onChange={(e) => {
                      if (clientPhoneError) setClientPhoneError(null);
                      let val = e.target.value.replace(/[^\d\s]/g, '');
                      if (val.trim().startsWith('0')) val = val.trim().replace(/^0+/, '');
                      setClientData({ ...clientData, phone: val });
                    }}
                    className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>
                {clientPhoneError && (
                  <span className="text-xs text-[#B22222] font-medium px-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {clientPhoneError}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mot de passe"
                    value={clientData.password}
                    onChange={(e) => setClientData({ ...clientData, password: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-[#0B2C25]/55 px-2">
                  8 caractères minimum, avec au moins une lettre et un chiffre.
                </span>
              </div>

              <label className="flex items-start gap-2.5 text-xs sm:text-[13px] text-[#0B2C25]/85 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={clientData.acceptTerms}
                  onChange={(e) => setClientData({ ...clientData, acceptTerms: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded border-[#0B2C25]/50 text-[#0B2C25] cursor-pointer"
                />
                <span>J’accepte les Conditions d’utilisation et la Politique de confidentialité.</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
              >
                {loading ? 'Création en cours...' : 'Créer mon compte'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            <p className="text-center text-xs sm:text-[14px] text-[#0B2C25]/70 pt-2">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="font-semibold text-[#17664E] hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}

        {/* ─── CAS 2 : INSCRIPTION COMMERÇANT EN 3 ÉTAPES (Frames 09, 10, 11, 12) ─── */}
        {role === 'MERCHANT' && (
          <>
            {/* Roadmap / Stepper officiel Figma : [1 Compte] [2 Commerce] [3 Documents] */}
            {merchantStep !== 4 && (
              <div className="w-full flex flex-col gap-2 mb-2">
                {/* Pastilles & Lignes de liaison (pleine largeur, bord à bord comme Figma) */}
                <div className="flex items-center w-full">
                  {/* Pastille 1 : Compte */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      merchantStep > 1
                        ? 'bg-[#0B2C25] text-white shadow-sm'
                        : 'bg-white border-2 border-[#0B2C25] text-[#0B2C25] font-medium text-sm'
                    }`}
                  >
                    {merchantStep > 1 ? (
                      <img src={checkmarkIcon} alt="" className="w-[18px] h-[18px]" />
                    ) : (
                      '1'
                    )}
                  </div>

                  {/* Ligne 1-2 */}
                  <div
                    className={`flex-1 h-[2px] mx-2 transition-all ${
                      merchantStep > 1 ? 'bg-[#0B2C25]/80' : 'bg-[#0B2C25]/15'
                    }`}
                  />

                  {/* Pastille 2 : Commerce */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      merchantStep > 2
                        ? 'bg-[#0B2C25] text-white shadow-sm'
                        : merchantStep === 2
                        ? 'bg-white border-2 border-[#0B2C25] text-[#0B2C25] font-medium text-sm'
                        : 'bg-white border-[1.5px] border-[#0B2C25]/25 text-[#0B2C25]/40 font-normal text-sm'
                    }`}
                  >
                    {merchantStep > 2 ? (
                      <img src={checkmarkIcon} alt="" className="w-[18px] h-[18px]" />
                    ) : (
                      '2'
                    )}
                  </div>

                  {/* Ligne 2-3 */}
                  <div
                    className={`flex-1 h-[2px] mx-2 transition-all ${
                      merchantStep === 3 ? 'bg-[#0B2C25]/80' : 'bg-[#0B2C25]/15'
                    }`}
                  />

                  {/* Pastille 3 : Documents */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      merchantStep === 3
                        ? 'bg-white border-2 border-[#0B2C25] text-[#0B2C25] font-medium text-sm'
                        : 'bg-white border-[1.5px] border-[#0B2C25]/25 text-[#0B2C25]/40 font-normal text-sm'
                    }`}
                  >
                    3
                  </div>
                </div>

                {/* Libellés sous les pastilles (alignés au pixel près comme Figma) */}
                <div className="flex items-center justify-between w-full text-[12px] select-none">
                  <span
                    className={`transition-all text-left ${
                      merchantStep === 1
                        ? 'font-medium text-[#0B2C25]'
                        : 'font-normal text-[#0B2C25]/50'
                    }`}
                  >
                    Compte
                  </span>
                  <span
                    className={`transition-all text-center ${
                      merchantStep === 2
                        ? 'font-medium text-[#0B2C25]'
                        : 'font-normal text-[#0B2C25]/50'
                    }`}
                  >
                    Commerce
                  </span>
                  <span
                    className={`transition-all text-right ${
                      merchantStep === 3
                        ? 'font-medium text-[#0B2C25]'
                        : 'font-normal text-[#0B2C25]/50'
                    }`}
                  >
                    Documents
                  </span>
                </div>
              </div>
            )}

            {/* ÉTAPE 1 : VOS INFORMATIONS (Frame 09) */}
            {merchantStep === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const rawPhone = merchantData.phone.replace(/[\s.\-()]/g, '');
                  const phoneDigits = rawPhone.replace(/^(\+213|00213|213|0)/, '');
                  const isValidAlgerianPhone = /^[567]\d{8}$/.test(phoneDigits);

                  if (!isValidAlgerianPhone) {
                    setMerchantPhoneError('Numéro de téléphone incorrect. Il doit comporter 9 chiffres et commencer par 5, 6 ou 7 (ex: 6 61 45 17 40).');
                    return;
                  }

                  setMerchantPhoneError(null);
                  setMerchantStep(2);
                }}
                className="flex flex-col gap-4"
              >
                <div className="text-center flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-[30px] font-semibold text-[#0B2C25]">
                    Créer un compte commerçant
                  </h1>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/65">
                    Étape 1 sur 3 · Vos informations
                  </p>
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition">
                  <img src={inputUserIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Nom du responsable"
                    value={merchantData.ownerName}
                    onChange={(e) => setMerchantData({ ...merchantData, ownerName: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition">
                  <img src={inputMailIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="E-mail professionnel"
                    value={merchantData.email}
                    onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className={`flex items-center bg-white/65 border-[1.2px] rounded-[14px] h-14 px-4 transition ${
                      merchantPhoneError
                        ? 'border-[#B22222] bg-[#B22222]/5'
                        : 'border-white/95 focus-within:border-[#17664E]'
                    }`}
                  >
                    <img src={inputPhoneIcon} alt="" className="w-5 h-5 opacity-60 mr-2.5 shrink-0" />
                    <span className="text-[#0B2C25] font-semibold text-sm select-none mr-2">
                      +213
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="6 61 45 17 40"
                      value={merchantData.phone}
                      onChange={(e) => {
                        if (merchantPhoneError) setMerchantPhoneError(null);
                        let val = e.target.value.replace(/[^\d\s]/g, '');
                        if (val.trim().startsWith('0')) val = val.trim().replace(/^0+/, '');
                        setMerchantData({ ...merchantData, phone: val });
                      }}
                      className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                    />
                  </div>
                  {merchantPhoneError && (
                    <span className="text-xs text-[#B22222] font-medium px-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {merchantPhoneError}
                    </span>
                  )}
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition justify-between">
                  <div className="flex items-center flex-1 mr-2">
                    <img src={inputLockIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                    <input
                      type={showMerchantPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Mot de passe"
                      value={merchantData.password}
                      onChange={(e) => setMerchantData({ ...merchantData, password: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMerchantPassword(!showMerchantPassword)}
                    className="p-1 opacity-60 hover:opacity-100 transition cursor-pointer"
                  >
                    <img src={inputEyeIcon} alt="" className="w-5 h-5" />
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full h-14 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99] mt-2"
                >
                  <span>Continuer</span>
                  <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                </button>

                <p className="text-center text-xs sm:text-[14px] text-[#0B2C25]/70 pt-1">
                  Vous avez déjà un compte ?{' '}
                  <Link to="/login" className="font-semibold text-[#17664E] hover:underline">
                    Se connecter
                  </Link>
                </p>
              </form>
            )}

            {/* ÉTAPE 2 : VOTRE COMMERCE (Frame 10) */}
            {merchantStep === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMerchantStep(3);
                }}
                className="flex flex-col gap-4"
              >
                <div className="text-center flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-[30px] font-semibold text-[#0B2C25]">
                    Votre commerce
                  </h1>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/65">
                    Étape 2 sur 3 · Présentez votre boutique
                  </p>
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition">
                  <img src={inputStoreIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Nom du commerce"
                    value={merchantData.shopName}
                    onChange={(e) => setMerchantData({ ...merchantData, shopName: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition justify-between">
                  <div className="flex items-center flex-1 mr-2">
                    <img src={inputStoreIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                    <select
                      value={merchantData.category}
                      onChange={(e) => setMerchantData({ ...merchantData, category: e.target.value })}
                      className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none cursor-pointer font-medium appearance-none"
                    >
                      <option value="Boulangerie & Pâtisserie">Boulangerie & Pâtisserie</option>
                      <option value="Fruits & Légumes">Fruits & Légumes (Primeur)</option>
                      <option value="Restaurant & Traiteur">Restaurant & Traiteur</option>
                      <option value="Supermarché & Épicerie">Supermarché & Épicerie</option>
                      <option value="Boucherie & Fromagerie">Boucherie & Fromagerie</option>
                    </select>
                  </div>
                  <img src={inputChevronDownIcon} alt="" className="w-4 h-4 opacity-60 pointer-events-none" />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition">
                  <img src={inputFileTextIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Numéro de registre de commerce (RC)"
                    value={merchantData.rcNumber}
                    onChange={(e) => setMerchantData({ ...merchantData, rcNumber: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4 focus-within:border-[#17664E] transition">
                  <img src={inputPinIcon} alt="" className="w-5 h-5 opacity-60 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="Adresse complète du commerce (Ville, Wilaya)"
                    value={merchantData.address}
                    onChange={(e) => setMerchantData({ ...merchantData, address: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none placeholder:text-[#0B2C25]/40 font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMerchantStep(1)}
                    className="w-[110px] h-14 bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-semibold text-sm rounded-[16px] flex items-center justify-center transition cursor-pointer"
                  >
                    <span>Retour</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-14 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99]"
                  >
                    <span>Continuer</span>
                    <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 3 : DOCUMENTS DE VÉRIFICATION (Frame 11) */}
            {merchantStep === 3 && (
              <form onSubmit={handleMerchantFinalSubmit} className="flex flex-col gap-4">
                <div className="text-center flex flex-col gap-1">
                  <h1 className="text-2xl sm:text-[30px] font-semibold text-[#0B2C25]">
                    Documents de vérification
                  </h1>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/65">
                    Étape 3 sur 3 · Pour sécuriser la plateforme
                  </p>
                </div>

                {/* Pièce 1 : Registre de commerce */}
                <div className="bg-white/50 border border-white/80 rounded-[16px] px-3.5 py-3 flex items-center justify-between min-h-[67px] transition shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <img src={uploadIcon} alt="" className="w-5 h-5 text-[#0B2C25]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <p className="text-sm font-semibold text-[#0B2C25]">Registre de commerce</p>
                      <p className="text-xs text-[#0B2C25]/50 truncate max-w-[200px]">
                        {merchantData.commercialRegisterFile ? merchantData.commercialRegisterFile.name : 'PDF, JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  {merchantData.commercialRegisterFile ? (
                    <label className="cursor-pointer bg-[#EAF6EB] text-[#17664E] border border-[#17664E]/20 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition">
                      <img src={checkmarkIcon} alt="" className="w-3.5 h-3.5" />
                      <span>Importé</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, commercialRegisterFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  ) : (
                    <label className="cursor-pointer px-3.5 py-1.5 bg-white/70 hover:bg-white text-xs font-semibold text-[#0B2C25] border border-[#0B2C25]/15 rounded-full transition shadow-sm">
                      Importer
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, commercialRegisterFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  )}
                </div>

                {/* Pièce 2 : Numéro d'identification fiscale (NIF) */}
                <div className="bg-white/50 border border-white/80 rounded-[16px] px-3.5 py-3 flex items-center justify-between min-h-[67px] transition shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <img src={uploadIcon} alt="" className="w-5 h-5 text-[#0B2C25]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <p className="text-sm font-semibold text-[#0B2C25]">Numéro d’identification fiscale</p>
                      <p className="text-xs text-[#0B2C25]/50 truncate max-w-[200px]">
                        {merchantData.taxIdFile ? merchantData.taxIdFile.name : 'PDF, JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  {merchantData.taxIdFile ? (
                    <label className="cursor-pointer bg-[#EAF6EB] text-[#17664E] border border-[#17664E]/20 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition">
                      <img src={checkmarkIcon} alt="" className="w-3.5 h-3.5" />
                      <span>Importé</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, taxIdFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  ) : (
                    <label className="cursor-pointer px-3.5 py-1.5 bg-white/70 hover:bg-white text-xs font-semibold text-[#0B2C25] border border-[#0B2C25]/15 rounded-full transition shadow-sm">
                      Importer
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, taxIdFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  )}
                </div>

                {/* Pièce 3 : Photo de la devanture */}
                <div className="bg-white/50 border border-white/80 rounded-[16px] px-3.5 py-3 flex items-center justify-between min-h-[67px] transition shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <img src={uploadIcon} alt="" className="w-5 h-5 text-[#0B2C25]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <p className="text-sm font-semibold text-[#0B2C25]">Photo de la devanture</p>
                      <p className="text-xs text-[#0B2C25]/50 truncate max-w-[200px]">
                        {merchantData.storefrontFile ? merchantData.storefrontFile.name : 'JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  {merchantData.storefrontFile ? (
                    <label className="cursor-pointer bg-[#EAF6EB] text-[#17664E] border border-[#17664E]/20 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition">
                      <img src={checkmarkIcon} alt="" className="w-3.5 h-3.5" />
                      <span>Importé</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, storefrontFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  ) : (
                    <label className="cursor-pointer px-3.5 py-1.5 bg-white/70 hover:bg-white text-xs font-semibold text-[#0B2C25] border border-[#0B2C25]/15 rounded-full transition shadow-sm">
                      Importer
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => setMerchantData({ ...merchantData, storefrontFile: e.target.files?.[0] || null })}
                      />
                    </label>
                  )}
                </div>

                {/* Bloc Information officiel */}
                <div className="flex items-center gap-2.5 bg-white/40 border border-white/70 rounded-[14px] p-3 text-xs text-[#0B2C25]/80 text-left">
                  <img src={infoCircleIcon} alt="" className="w-5 h-5 shrink-0 opacity-80" />
                  <span>Vos documents ne sont visibles que par l’équipe FORSA.</span>
                </div>

                {/* Case à cocher officielle */}
                <label className="flex items-start gap-2.5 text-xs text-[#0B2C25]/85 cursor-pointer pt-1 text-left">
                  <input
                    type="checkbox"
                    checked={merchantData.acceptTerms}
                    onChange={(e) => setMerchantData({ ...merchantData, acceptTerms: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded border-[#0B2C25]/40 text-[#0B2C25] focus:ring-0 cursor-pointer"
                  />
                  <span>J’accepte les Conditions d’utilisation et la Politique de confidentialité.</span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMerchantStep(2)}
                    className="w-[110px] h-14 bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-semibold text-sm rounded-[16px] flex items-center justify-center transition cursor-pointer"
                  >
                    <span>Retour</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-14 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99] disabled:opacity-60"
                  >
                    <span>{loading ? 'Envoi...' : 'Envoyer ma demande'}</span>
                    <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 4 : DEMANDE ENVOYÉE — SUCCÈS (Frame 12) */}
            {merchantStep === 4 && (
              <div className="text-center flex flex-col items-center gap-5 py-2 animate-fade-in">
                {/* Illustration sablier officielle 96x96 */}
                <img src={clockPendingIcon} alt="" className="w-24 h-24 mx-auto" />

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl sm:text-[30px] font-semibold text-[#0B2C25]">
                    Demande envoyée !
                  </h1>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/75 max-w-md leading-relaxed">
                    Nous vérifions vos documents (délai habituel : 48 h). Vous pourrez publier des offres dès l’approbation de votre compte.
                  </p>
                </div>

                {/* Bloc Information officiel Frame 12 */}
                <div className="flex items-start gap-2.5 bg-white/40 border border-white/70 rounded-[14px] p-3 text-xs text-[#0B2C25]/80 text-left">
                  <img src={infoCircleIcon} alt="" className="w-5 h-5 shrink-0 opacity-80 mt-0.5" />
                  <span>Confirmez aussi votre adresse e-mail : sans e-mail vérifié, vous ne pouvez pas publier d’offre.</span>
                </div>

                <div className="flex flex-col gap-3 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/verify-email')}
                    className="w-full h-14 bg-[#0B2C25] hover:bg-[#17664E] text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-[0.99]"
                  >
                    <span>Vérifier mon e-mail</span>
                    <img src={arrowRightIcon} alt="" className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full h-14 bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-semibold text-sm rounded-[16px] flex items-center justify-center transition cursor-pointer"
                  >
                    Retour à l’accueil
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Spacer pour alignement vertical exact */}
      <div className="relative z-10 w-full max-w-6xl h-8" />
    </div>
  );
};
