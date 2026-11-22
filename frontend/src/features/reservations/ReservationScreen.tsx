import React, { useState } from "react";
import calendarIcon from "./assets/icons/calendar-03.svg";
// import checkIcon from "./assets/icons/checkmark-circle-02.svg"; // not used currently
import closeIcon from "./assets/icons/cancel-01.svg";

// Import the new screens
import { ReservationList } from "./ReservationList";
import { ReservationDetail } from "./ReservationDetail";
import { CreateReservationForm } from "./CreateReservationForm";
import { ReservationSuccess } from "./ReservationSuccess";
import { MerchantDashboard } from "./MerchantDashboard";

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
            onSuccess={() => setScreen("success")}
            onCancel={() => setScreen("list")}
          />
        );
      case "success":
        return <ReservationSuccess onBack={() => setScreen("list")} />;
      case "merchant":
        return <MerchantDashboard onBack={() => setScreen("list")} />;
      default:
        return null;
    }
  };

  return (
    <section className="w-full max-w-[390px] mx-auto bg-[#FBF6EC]">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 px-3.5" style={{ height: "46px" }}>
        <img src={calendarIcon} alt="Calendar" style={{ width: "46px", height: "46px", objectFit: "cover" }} />
        <p className="font-poppins font-medium" style={{ fontSize: "10px" }}>Reservation</p>
      </div>

      {/* Main content */}
      <div className="px-4 py-2">{renderScreen()}</div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between w-[390px] h-[72px] bg-white shadow-card px-4">
        <img src={closeIcon} alt="Close" className="w-6 h-6" />
        <p className="text-base font-semibold font-poppins">Voir mes réservations</p>
      </div>
    </section>
  );
};

export default ReservationScreen;
