import React, { useState } from "react";

// Import the new screens
import { ReservationList } from "./ReservationList";
import { ReservationDetail } from "./ReservationDetail";
import { CreateReservationForm } from "./CreateReservationForm";
import { ReservationSuccess } from "./ReservationSuccess";
import { MerchantDashboard } from "./MerchantDashboard";
import type { Reservation } from "./types";

export const ReservationScreen: React.FC = () => {
  // simple routing via local state
  const [screen, setScreen] = useState<
    | "list"
    | "detail"
    | "create"
    | "success"
    | "merchant"
  >("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const renderScreen = () => {
    switch (screen) {
      case "list":
        return (
          <ReservationList
            onSelect={(id) => {
              setSelectedId(id);
              setScreen("detail");
            }}
            onCreate={() => setScreen("create")}
            onMerchant={() => setScreen("merchant")}
          />
        );
      case "detail":
        return selectedId ? (
          <ReservationDetail
            reservationId={selectedId}
            onBack={() => setScreen("list")}
          />
        ) : null;
      case "create":
        return (
          <CreateReservationForm
            onSuccess={(reservation) => {
              setCreatedReservation(reservation ?? null);
              setScreen("success");
            }}
            onCancel={() => setScreen("list")}
          />
        );
      case "success":
        return (
          <ReservationSuccess
            reservation={createdReservation}
            onBack={() => setScreen("list")}
          />
        );
      case "merchant":
        return <MerchantDashboard onBack={() => setScreen("list")} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-forsa-cream font-poppins">
      {renderScreen()}
    </div>
  );
};

export default ReservationScreen;
