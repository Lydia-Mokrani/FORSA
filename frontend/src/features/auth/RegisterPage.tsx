import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Store, Mail, Lock, Phone, Upload, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, ShieldCheck, FileText, Camera } from 'lucide-react';

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

  // Soumission de l'inscription Client (Figma Frame 08)
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData.acceptTerms) {
      setErrorMessage('Veuillez accepter les Conditions d’utilisation et la Politique de confidentialité.');
      return;
    }
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: clientData.fullName,
          email: clientData.email,
          phone: clientData.phone,
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

      // Rediriger vers la vérification du numéro ou l'accueil
      navigate('/verify-phone');
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
      // 1. Inscription du compte utilisateur Commerçant
      const authRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: merchantData.ownerName,
          email: merchantData.email,
          phone: merchantData.phone,
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between px-6 py-8 sm:px-16 font-poppins selection:bg-forsa-leaf selection:text-white bg-[#fffaf0] overflow-x-hidden">
      {/* En-tête officiel Figma */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-8">
        <Link to="/" className="text-[24px] font-extrabold tracking-tight text-[#0B2C25] hover:opacity-90 transition">
          FORSA
        </Link>
        <span className="text-[14px] font-medium text-[#0B2C25]/85">
          Donnez une autre vie à vos invendus
        </span>
      </header>

      {/* Carte Glassmorphism */}
      <main className="w-full max-w-[560px] backdrop-blur-[20px] bg-white/35 border-[1.2px] border-white/70 rounded-[32px] p-6 sm:p-10 shadow-[0px_16px_40px_0px_rgba(0,0,0,0.10)] flex flex-col gap-5 sm:gap-6">
        
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
              {role === 'CUSTOMER' ? <User className="w-4 h-4 text-[#0B2C25]" /> : <Store className="w-4 h-4 text-[#0B2C25]" />}
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

              <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                <Phone className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                <input
                  type="tel"
                  placeholder="Numéro de téléphone"
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  className="w-full bg-transparent text-[#0B2C25] text-sm sm:text-[15px] focus:outline-none"
                />
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
            {/* Stepper officiel Figma : [1 Compte] [2 Commerce] [3 Documents] */}
            {merchantStep !== 4 && (
              <div className="flex items-center justify-between w-full px-4 mb-2">
                {[
                  { num: 1, label: 'Compte' },
                  { num: 2, label: 'Commerce' },
                  { num: 3, label: 'Documents' },
                ].map((s) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        merchantStep === s.num
                          ? 'bg-[#0B2C25] text-white shadow-sm'
                          : merchantStep > s.num
                          ? 'bg-[#17664E] text-white'
                          : 'bg-white/60 text-[#0B2C25]/50 border border-[#0B2C25]/20'
                      }`}
                    >
                      {merchantStep > s.num ? '✓' : s.num}
                    </div>
                    <span className={`text-xs font-medium ${merchantStep === s.num ? 'text-[#0B2C25]' : 'text-[#0B2C25]/60'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ÉTAPE 1 : VOS INFORMATIONS (Frame 09) */}
            {merchantStep === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
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

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <User className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="text"
                    required
                    placeholder="Nom du responsable"
                    value={merchantData.ownerName}
                    onChange={(e) => setMerchantData({ ...merchantData, ownerName: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <Mail className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="email"
                    required
                    placeholder="E-mail professionnel"
                    value={merchantData.email}
                    onChange={(e) => setMerchantData({ ...merchantData, email: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <Phone className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="tel"
                    required
                    placeholder="Téléphone"
                    value={merchantData.phone}
                    onChange={(e) => setMerchantData({ ...merchantData, phone: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <Lock className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mot de passe"
                    value={merchantData.password}
                    onChange={(e) => setMerchantData({ ...merchantData, password: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium text-base rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
                >
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </button>
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

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <Store className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="text"
                    required
                    placeholder="Nom du commerce"
                    value={merchantData.shopName}
                    onChange={(e) => setMerchantData({ ...merchantData, shopName: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <select
                    value={merchantData.category}
                    onChange={(e) => setMerchantData({ ...merchantData, category: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="Boulangerie & Pâtisserie">Boulangerie & Pâtisserie</option>
                    <option value="Fruits & Légumes">Fruits & Légumes (Primeur)</option>
                    <option value="Restaurant & Traiteur">Restaurant & Traiteur</option>
                    <option value="Supermarché & Épicerie">Supermarché & Épicerie</option>
                    <option value="Boucherie & Fromagerie">Boucherie & Fromagerie</option>
                  </select>
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <FileText className="w-5 h-5 text-[#0B2C25]/50 mr-3" />
                  <input
                    type="text"
                    placeholder="Numéro de registre de commerce"
                    value={merchantData.rcNumber}
                    onChange={(e) => setMerchantData({ ...merchantData, rcNumber: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center bg-white/65 border-[1.2px] border-white/95 rounded-[14px] h-14 px-4">
                  <input
                    type="text"
                    required
                    placeholder="Adresse complète du commerce (Ville, Wilaya)"
                    value={merchantData.address}
                    onChange={(e) => setMerchantData({ ...merchantData, address: e.target.value })}
                    className="w-full bg-transparent text-[#0B2C25] text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMerchantStep(1)}
                    className="h-14 bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-medium rounded-[16px] flex items-center justify-center gap-2 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    type="submit"
                    className="h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
                  >
                    Continuer
                    <ArrowRight className="w-5 h-5" />
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
                <div className="bg-white/60 border-[1.2px] border-white/90 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-[#17664E]" />
                    <div>
                      <p className="text-sm font-semibold text-[#0B2C25]">Registre de commerce</p>
                      <p className="text-xs text-[#0B2C25]/50">
                        {merchantData.commercialRegisterFile ? merchantData.commercialRegisterFile.name : 'PDF, JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  <label className="cursor-pointer bg-[#17664E] hover:bg-[#17664E]/90 text-white text-xs font-medium px-4 py-2 rounded-xl transition">
                    {merchantData.commercialRegisterFile ? 'Modifier' : 'Importer'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setMerchantData({ ...merchantData, commercialRegisterFile: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>

                {/* Pièce 2 : Numéro d'identification fiscale (NIF) */}
                <div className="bg-white/60 border-[1.2px] border-white/90 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-[#17664E]" />
                    <div>
                      <p className="text-sm font-semibold text-[#0B2C25]">Numéro d’identification fiscale</p>
                      <p className="text-xs text-[#0B2C25]/50">
                        {merchantData.taxIdFile ? merchantData.taxIdFile.name : 'PDF, JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  <label className="cursor-pointer bg-[#17664E] hover:bg-[#17664E]/90 text-white text-xs font-medium px-4 py-2 rounded-xl transition">
                    {merchantData.taxIdFile ? 'Modifier' : 'Importer'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setMerchantData({ ...merchantData, taxIdFile: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>

                {/* Pièce 3 : Photo de la devanture */}
                <div className="bg-white/60 border-[1.2px] border-white/90 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="w-6 h-6 text-[#17664E]" />
                    <div>
                      <p className="text-sm font-semibold text-[#0B2C25]">Photo de la devanture</p>
                      <p className="text-xs text-[#0B2C25]/50">
                        {merchantData.storefrontFile ? merchantData.storefrontFile.name : 'JPG ou PNG · 5 Mo max'}
                      </p>
                    </div>
                  </div>
                  <label className="cursor-pointer bg-[#17664E] hover:bg-[#17664E]/90 text-white text-xs font-medium px-4 py-2 rounded-xl transition">
                    {merchantData.storefrontFile ? 'Modifier' : 'Importer'}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => setMerchantData({ ...merchantData, storefrontFile: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 bg-white/40 p-3 rounded-xl text-xs text-[#0B2C25]/75">
                  <ShieldCheck className="w-4 h-4 text-[#17664E] shrink-0" />
                  <span>Vos documents ne sont visibles que par l’équipe FORSA.</span>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[#0B2C25]/85 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={merchantData.acceptTerms}
                    onChange={(e) => setMerchantData({ ...merchantData, acceptTerms: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded border-[#0B2C25]/50 text-[#0B2C25] cursor-pointer"
                  />
                  <span>J’accepte les Conditions d’utilisation et la Politique de confidentialité.</span>
                </label>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMerchantStep(2)}
                    className="h-14 bg-white/60 hover:bg-white/80 border border-[#0B2C25]/20 text-[#0B2C25] font-medium rounded-[16px] flex items-center justify-center gap-2 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-14 bg-[#0B2C25] hover:bg-[#0B2C25]/90 text-white font-medium rounded-[16px] flex items-center justify-center gap-2 shadow-md transition"
                  >
                    {loading ? 'Envoi...' : 'Envoyer ma demande'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            {/* ÉTAPE 4 : DEMANDE ENVOYÉE — SUCCÈS (Frame 12) */}
            {merchantStep === 4 && (
              <div className="text-center flex flex-col items-center gap-5 py-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-[#17664E] flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl sm:text-[32px] font-semibold text-[#0B2C25]">
                    Demande envoyée !
                  </h1>
                  <p className="text-xs sm:text-[14px] text-[#0B2C25]/75 max-w-md">
                    Nous vérifions vos documents (délai habituel : 48 h). Vous pourrez publier des offres dès l’approbation de votre compte.
                  </p>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-600/20 p-4 rounded-2xl text-xs text-[#0B2C25] text-left flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-[#17664E] shrink-0 mt-0.5" />
                  <p>
                    Confirmez aussi votre adresse e-mail : sans e-mail vérifié, vous ne pouvez pas publier d’offre.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/verify-email')}
                    className="flex-1 h-12 bg-[#17664E] hover:bg-[#17664E]/90 text-white font-medium text-xs sm:text-sm rounded-xl transition"
                  >
                    Vérifier mon e-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex-1 h-12 bg-white/70 hover:bg-white/90 border border-[#0B2C25]/20 text-[#0B2C25] font-medium text-xs sm:text-sm rounded-xl transition"
                  >
                    Retour à l’accueil
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="mt-8 sm:mt-12 text-center text-xs text-[#0B2C25]/60">
        © 2026 FORSA (فرصة) · Plateforme anti-gaspillage alimentaire
      </footer>
    </div>
  );
};
