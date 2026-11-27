import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReservationsApi } from './services/reservationsApi';
import type { Reservation } from './types';

interface MerchantDashboardProps {
  onBack: () => void;
}

export const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ onBack }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState('');
  const [pickupBusy, setPickupBusy] = useState(false);
  const [pickupMessage, setPickupMessage] = useState<string | null>(null);
  const [pickupHistory, setPickupHistory] = useState<Reservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanTimer = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReservations(await ReservationsApi.getShopReservations());
    } catch (e: any) {
      setError(e.message || 'Impossible de charger les réservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPickupHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const history = await ReservationsApi.getShopHistory();
      setPickupHistory(history.filter((r) => r.status === 'PICKED_UP'));
    } catch (e: any) {
      setError(e.message || 'Impossible de charger l’historique des retraits');
      setPickupHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    loadPickupHistory();
  }, [loadReservations, loadPickupHistory]);

  const stopScan = useCallback(() => {
    if (scanTimer.current !== null) {
      window.clearInterval(scanTimer.current);
      scanTimer.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopScan(), [stopScan]);

  const startScan = async () => {
    setScanError(null);
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      setScanError('Scan caméra indisponible : saisir le code manuellement.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError('Caméra indisponible : saisir le code manuellement.');
      return;
    }

    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = videoRef.current;
      if (!video) {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        return;
      }
      video.srcObject = stream.current;
      await video.play();
      const detector = new Detector({ formats: ['qr_code'] });
      setCameraActive(true);
      scanTimer.current = window.setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes?.length) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              setPickupCode(rawValue);
              stopScan();
            }
          }
        } catch {}
      }, 500);
    } catch (e: any) {
      stopScan();
      setScanError(e.message || 'Caméra indisponible : saisir le code manuellement.');
    }
  };

  const handleAccept = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await ReservationsApi.acceptReservation(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'ACCEPTED' } : r)));
    } catch (e: any) {
      setError(e.message || "Échec de l'acceptation");
    } finally {
      setBusyId(null);
    }
  };

  const handleRefuse = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await ReservationsApi.refuseReservation(id);
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'REFUSED' } : r)));
    } catch (e: any) {
      setError(e.message || 'Échec du refus');
    } finally {
      setBusyId(null);
    }
  };

  const handlePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = pickupCode.trim();
    if (!code || pickupBusy) return;
    setPickupBusy(true);
    setError(null);
    setPickupMessage(null);
    try {
      await ReservationsApi.pickupByCode(code);
      setPickupMessage('Retrait confirmé · réservation récupérée');
      setPickupCode('');
      await loadReservations();
      await loadPickupHistory();
    } catch (err: any) {
      setError(err.message || 'Échec du retrait');
    } finally {
      setPickupBusy(false);
    }
  };

  return (
    <div className="font-poppins">
      <h2 className="font-poppins font-medium text-lg mb-4">Tableau marchand</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <section className="mb-6 border border-[#dbf0dd] rounded-[16px] p-4 bg-[#fffaf0]">
        <h3 className="font-semibold mb-2">Confirmer le retrait</h3>
        <form onSubmit={handlePickup} className="flex flex-col gap-2">
          <input
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value)}
            placeholder="Code de retrait ou QR"
            autoCapitalize="off"
            autoComplete="off"
            className="px-3 py-2 border border-[#78847f] rounded-[12px]"
          />
          <button
            type="button"
            onClick={cameraActive ? stopScan : startScan}
            className="px-4 py-2 border border-[#78847f] text-[#0b2c25] rounded-[12px]"
          >
            {cameraActive ? 'Arrêter le scan' : 'Scanner le QR'}
          </button>
          {scanError && <p className="text-red-500 text-sm">{scanError}</p>}
          <video ref={videoRef} className={cameraActive ? 'w-full max-w-[320px] rounded-[12px]' : 'hidden'} muted playsInline />
          <p className="text-sm text-[#0b2c25]">Paiement sur place · Réglez sur place · Confirmer la remise</p>
          <button
            type="submit"
            disabled={pickupBusy || !pickupCode.trim()}
            className="px-4 py-2 bg-[#0b2c25] text-white rounded-[12px] disabled:opacity-50"
          >
            Confirmer le paiement et la remise
          </button>
          {pickupMessage && <p className="text-green-700">{pickupMessage}</p>}
        </form>
      </section>

      {loading ? (
        <p>Chargement...</p>
      ) : reservations.length === 0 ? (
        <p>Aucune réservation.</p>
      ) : (
        <ul className="space-y-4">
          {reservations.map((r) => {
            const isPending = r.status === 'PENDING';
            const isBusy = busyId === r.id;
            return (
              <li key={r.id} className="border border-[#dbf0dd] rounded-[16px] p-4 bg-[#fffaf0]">
                <p className="font-semibold">{r.offerTitle || `Réservation #${r.id.slice(0, 6)}`}</p>
                <p className="text-sm">{r.customerName || r.customerEmail}</p>
                <p className="text-sm">Quantité : {r.quantity}</p>
                <p className="text-sm">Code : {r.pickupCode}</p>
                <p className="text-sm">Statut : {r.status}</p>
                <p className="text-sm">Créneau : {new Date(r.pickupStart).toLocaleString('fr-FR')} – {new Date(r.pickupEnd).toLocaleString('fr-FR')}</p>
                <p className="text-sm">Total : {r.totalPrice} DA</p>
                {isPending && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleAccept(r.id)}
                      className="px-4 py-2 bg-[#0b2c25] text-white rounded-[12px] disabled:opacity-50"
                    >
                      Accepter
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRefuse(r.id)}
                      className="px-4 py-2 border border-[#78847f] text-[#0b2c25] rounded-[12px] disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-6 border border-[#dbf0dd] rounded-[16px] p-4 bg-[#fffaf0]">
        <h3 className="font-semibold mb-2">Historique des retraits</h3>
        {historyLoading ? (
          <p>Chargement...</p>
        ) : pickupHistory.length === 0 ? (
          <p>Aucun retrait confirmé.</p>
        ) : (
          <ul className="space-y-3">
            {pickupHistory.map((r) => (
              <li key={r.id} className="border border-[#dbf0dd] rounded-[12px] p-3">
                <p className="font-semibold">{r.offerTitle || `Réservation #${r.id.slice(0, 6)}`}</p>
                <p className="text-sm">Retrait confirmé · réservation récupérée</p>
                <p className="text-sm">{r.customerName || r.customerEmail}</p>
                <p className="text-sm">Code : {r.pickupCode}</p>
                <p className="text-sm">Quantité : {r.quantity}</p>
                <p className="text-sm">Total : {r.totalPrice} DA</p>
                <p className="text-sm">
                  Retrait : {r.pickedUpAt ? new Date(r.pickedUpAt).toLocaleString('fr-FR') : '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="mt-4 px-4 py-2 bg-gray-300 rounded" onClick={onBack}>Retour</button>
    </div>
  );
};
