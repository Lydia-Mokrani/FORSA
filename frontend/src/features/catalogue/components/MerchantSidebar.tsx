// frontend/src/features/catalogue/components/MerchantSidebar.tsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarCheck,
  Plus,
  Star,
  User,
  LogOut,
} from 'lucide-react';

interface MerchantSidebarProps {
  variant?: 'merchant' | 'client';
  reservationsCount?: number;
  notificationsCount?: number;
}

// ── FIGMA EXACT SVG ICONS WITH DYNAMIC CURRENTCOLOR ──
const NavHomeIcon: React.FC<{ className?: string }> = ({ className = 'h-[19px] w-[20px]' }) => (
  <svg
    viewBox="0 0 19.7083 18.9256"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9.85417 14.0814H9.8624"
      stroke="currentColor"
      strokeWidth="1.83333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.1875 6.22981V10.8484C17.1875 14.332 17.1875 16.0737 16.1136 17.1559C15.0396 18.2381 13.3111 18.2381 9.85417 18.2381C6.3972 18.2381 4.66872 18.2381 3.59478 17.1559C2.52083 16.0737 2.52083 14.332 2.52083 10.8484V6.22981"
      stroke="currentColor"
      strokeWidth="1.375"
    />
    <path
      d="M19.0208 8.07724L15.0396 4.23041C12.5952 1.86847 11.373 0.6875 9.85417 0.6875C8.33538 0.6875 7.11316 1.86847 4.66872 4.2304L0.687501 8.07724"
      stroke="currentColor"
      strokeWidth="1.375"
      strokeLinecap="round"
    />
  </svg>
);

const NavMapIcon: React.FC<{ className?: string }> = ({ className = 'h-[20px] w-[14.5px]' }) => (
  <svg
    viewBox="0 0 14.209 19.8494"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9.39617 7.15353C9.39617 8.42891 8.37015 9.46282 7.1045 9.46282C5.83885 9.46282 4.81283 8.42891 4.81283 7.15353C4.81283 5.87814 5.83885 4.84423 7.1045 4.84423C8.37015 4.84423 9.39617 5.87814 9.39617 7.15353Z"
      stroke="currentColor"
      strokeWidth="1.375"
    />
    <path
      d="M8.25712 14.9992C7.94794 15.2993 7.5347 15.467 7.10464 15.467C6.67457 15.467 6.26133 15.2993 5.95216 14.9992C3.12094 12.2347 -0.673244 9.14648 1.17707 4.66293C2.17751 2.23872 4.57903 0.6875 7.10464 0.6875C9.63025 0.6875 12.0318 2.23872 13.0322 4.66293C14.8802 9.14083 11.0953 12.2442 8.25712 14.9992Z"
      stroke="currentColor"
      strokeWidth="1.375"
    />
    <path
      d="M12.6045 17.3144C12.6045 18.3347 10.1421 19.1619 7.1045 19.1619C4.06693 19.1619 1.6045 18.3347 1.6045 17.3144"
      stroke="currentColor"
      strokeWidth="1.375"
      strokeLinecap="round"
    />
  </svg>
);

const NavReservationsIcon: React.FC<{ className?: string }> = ({ className = 'size-[22px]' }) => (
  <svg
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M1.83333 8.25C2.56268 8.25 3.26215 8.53973 3.77788 9.05546C4.2936 9.57118 4.58333 10.2707 4.58333 11C4.58333 11.7293 4.2936 12.4288 3.77788 12.9445C3.26215 13.4603 2.56268 13.75 1.83333 13.75V15.5833C1.83333 16.0696 2.02649 16.5359 2.3703 16.8797C2.71412 17.2235 3.18044 17.4167 3.66667 17.4167H18.3333C18.8196 17.4167 19.2859 17.2235 19.6297 16.8797C19.9735 16.5359 20.1667 16.0696 20.1667 15.5833V13.75C19.4373 13.75 18.7378 13.4603 18.2221 12.9445C17.7064 12.4288 17.4167 11.7293 17.4167 11C17.4167 10.2707 17.7064 9.57118 18.2221 9.05546C18.7378 8.53973 19.4373 8.25 20.1667 8.25V6.41667C20.1667 5.93044 19.9735 5.46412 19.6297 5.1203C19.2859 4.77649 18.8196 4.58333 18.3333 4.58333H3.66667C3.18044 4.58333 2.71412 4.77649 2.3703 5.1203C2.02649 5.46412 1.83333 5.93044 1.83333 6.41667V8.25Z"
      stroke="currentColor"
      strokeWidth="1.98"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9167 4.58333V6.41667"
      stroke="currentColor"
      strokeWidth="1.98"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9167 15.5833V17.4167"
      stroke="currentColor"
      strokeWidth="1.98"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.9167 10.0833V11.9167"
      stroke="currentColor"
      strokeWidth="1.98"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NavNotificationsIcon: React.FC<{ className?: string }> = ({ className = 'h-[20px] w-[18px]' }) => (
  <svg
    viewBox="0 0 18.15 19.9833"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2.8035 9.5251C2.97906 6.18954 5.73483 3.575 9.075 3.575C12.4152 3.575 15.1709 6.18954 15.3465 9.5251C15.4138 10.8048 15.3364 12.1669 16.4797 13.0244C17.0118 13.4235 17.325 14.0498 17.325 14.7149C17.325 15.6299 16.6083 16.4083 15.675 16.4083H2.475C1.54165 16.4083 0.825 15.6299 0.825 14.7149C0.825 14.0498 1.13817 13.4235 1.67029 13.0244C2.81358 12.1669 2.73615 10.8048 2.8035 9.5251Z"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.7 1.85625C7.7 2.61564 8.31561 3.575 9.075 3.575C9.83439 3.575 10.45 2.61564 10.45 1.85625C10.45 1.09686 9.83439 0.825 9.075 0.825C8.31561 0.825 7.7 1.09686 7.7 1.85625Z"
      stroke="currentColor"
      strokeWidth="1.65"
    />
    <path
      d="M11.825 16.4083C11.825 17.9271 10.5938 19.1583 9.075 19.1583C7.55622 19.1583 6.325 17.9271 6.325 16.4083"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NavProfileIcon: React.FC<{ className?: string }> = ({ className = 'h-[20px] w-[18px]' }) => (
  <svg
    viewBox="0 0 17.8753 19.8494"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3.9671 13.1407C7.00824 11.3159 10.8671 11.3159 13.9082 13.1407C15.2051 13.9188 18.6054 15.5077 16.5344 17.496C15.5227 18.4672 14.396 19.1619 12.9794 19.1619H4.89595C3.47936 19.1619 2.35261 18.4672 1.34093 17.496C-0.730094 15.5077 2.67023 13.9188 3.9671 13.1407Z"
      stroke="currentColor"
      strokeWidth="1.375"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.0627 4.84423C13.0627 7.13993 11.2158 9.00096 8.93766 9.00096C6.65948 9.00096 4.81266 7.13993 4.81266 4.84423C4.81266 2.54853 6.65948 0.6875 8.93766 0.6875C11.2158 0.6875 13.0627 2.54853 13.0627 4.84423Z"
      stroke="currentColor"
      strokeWidth="1.375"
    />
  </svg>
);

const NavLeafIcon: React.FC<{ className?: string }> = ({ className = 'size-[22px]' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M1.9992 21C1.9992 17.9999 3.8493 15.6398 7.07948 14.9997C9.49962 14.5197 11.9998 12.9997 12.9998 11.9996M10.9994 20C9.2434 20.0053 7.5495 19.3504 6.25369 18.1653C4.95788 16.9802 4.15482 15.3513 4.00378 13.6018C3.85274 11.8523 4.36476 10.1099 5.43828 8.72022C6.5118 7.33055 8.0684 6.39509 9.79937 6.09937C15.4997 4.99933 16.9998 4.4793 18.9999 1.9992C19.9999 3.99928 21 6.17938 21 9.99954C21 15.4998 16.2197 20 10.9994 20Z"
      stroke="#DBF0DD"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const NavLogoutIcon: React.FC<{ className?: string }> = ({ className = 'size-[16px]' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9.04412 0.865379C8.70136 0.818428 8.35077 0.794118 7.99412 0.794118C4.01767 0.794118 0.794118 3.81619 0.794118 7.54412C0.794118 11.272 4.01767 14.2941 7.99412 14.2941C8.35077 14.2941 8.70136 14.2698 9.04412 14.2229"
      stroke="currentColor"
      strokeWidth="1.58824"
      strokeLinecap="round"
    />
    <path
      d="M14.2941 7.54412L6.79412 7.54412M14.2941 7.54412C14.2941 7.01895 12.7984 6.03776 12.4191 5.66912M14.2941 7.54412C14.2941 8.06929 12.7984 9.05047 12.4191 9.41912"
      stroke="currentColor"
      strokeWidth="1.58824"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MERCHANT_ITEMS = [
  { label: 'Tableau de bord', icon: LayoutGrid, to: '/merchant/dashboard' },
  { label: 'Réservations', icon: CalendarCheck },
  { label: 'Ajouter une offre', icon: Plus, to: '/merchant/create-offer' },
  { label: 'Avis', icon: Star },
  { label: 'Compte', icon: User, to: '/profile' },
];

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  variant = 'merchant',
  reservationsCount = 0,
  notificationsCount = 0,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('forsa_auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── CLIENT SIDEBAR (RESPONSIVE FLEX FIGMA 541:14424) ──
  if (variant === 'client') {
    return (
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col justify-between rounded-br-[31px] rounded-tr-[31px] bg-[#0B2C25] font-poppins md:flex overflow-y-auto overflow-x-hidden select-none">
        {/* TOP SECTION: Logo + Navigation */}
        <div className="flex flex-col w-full">
          {/* Logo FORSA */}
          <div className="pt-[38px] pb-[28px] pl-[75px]">
            <Link
              to="/"
              className="text-[18.5px] font-extrabold text-white tracking-wide hover:opacity-90 transition"
            >
              FORSA
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-[8px] pl-[20px] w-full">
            {/* Accueil */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex h-[52px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                  isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
                }`
              }
            >
              <div className="flex size-[22px] items-center justify-center shrink-0">
                <NavHomeIcon />
              </div>
              <span className="text-[14px] font-semibold">Accueil</span>
            </NavLink>

            {/* Carte */}
            <NavLink
              to="/map"
              className={({ isActive }) =>
                `flex h-[52px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                  isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
                }`
              }
            >
              <div className="flex size-[22px] items-center justify-center shrink-0">
                <NavMapIcon />
              </div>
              <span className="text-[14px] font-semibold">Carte</span>
            </NavLink>

            {/* Mes réservations */}
            <NavLink
              to="/reservations"
              className={({ isActive }) =>
                `flex h-[52px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                  isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
                }`
              }
            >
              <div className="flex size-[22px] items-center justify-center shrink-0">
                <NavReservationsIcon />
              </div>
              <span className="text-[14px] font-semibold whitespace-nowrap">Mes réservations</span>
              {typeof reservationsCount === 'number' && reservationsCount > 0 && (
                <div className="ml-auto mr-4 flex h-[19px] min-w-[19px] items-center justify-center rounded-[10px] bg-[#EDBD4D] px-[6px] text-[10px] font-semibold text-[#0B2C25]">
                  {reservationsCount}
                </div>
              )}
            </NavLink>

            {/* Notifications */}
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex h-[52px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                  isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
                }`
              }
            >
              <div className="flex size-[22px] items-center justify-center shrink-0">
                <NavNotificationsIcon />
              </div>
              <span className="text-[14px] font-semibold">Notifications</span>
              {typeof notificationsCount === 'number' && notificationsCount > 0 && (
                <div className="ml-auto mr-4 flex h-[19px] min-w-[19px] items-center justify-center rounded-[10px] bg-[#EDBD4D] px-[6px] text-[10px] font-semibold text-[#0B2C25]">
                  {notificationsCount}
                </div>
              )}
            </NavLink>

            {/* Profil */}
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex h-[52px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                  isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
                }`
              }
            >
              <div className="flex size-[22px] items-center justify-center shrink-0">
                <NavProfileIcon />
              </div>
              <span className="text-[14px] font-semibold">Profil</span>
            </NavLink>
          </nav>
        </div>

        {/* BOTTOM SECTION: Impact note + Déconnexion */}
        <div className="flex w-[166px] flex-col gap-[18px] pl-[36px] pb-[32px] pt-4">
          {/* Impact note */}
          <div className="flex gap-[10px] items-start">
            <NavLeafIcon className="size-[22px] shrink-0" />
            <p className="text-[12px] font-normal leading-[1.4] text-[#DBF0DD]">
              Moins de gaspillage, plus de bonnes choses.
            </p>
          </div>

          {/* Déconnexion */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[46px] w-full items-center justify-center gap-[10px] rounded-[11px] bg-white px-[18px] text-[13px] font-semibold text-[#0B2C25] shadow-sm hover:bg-[#EEF7EC] transition cursor-pointer"
          >
            <NavLogoutIcon />
            Déconnexion
          </button>
        </div>
      </aside>
    );
  }

  // ── MERCHANT SIDEBAR ──
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] rounded-r-[31px] bg-[#0B2C25] shadow-[10px_11px_72px_rgba(0,0,0,0.18)] md:block font-poppins">
      <Link
        to="/merchant/dashboard"
        className="absolute left-[75px] top-[71px] font-poppins text-[18.49px] font-extrabold leading-[28px] text-white"
      >
        FORSA
      </Link>

      <nav className="absolute inset-x-0 top-[190px] flex flex-col gap-[3px]">
        {MERCHANT_ITEMS.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `ml-[15px] block h-[60px] pl-[39px] pt-[10px] text-[13.87px] font-semibold leading-[21px] ${
                  isActive
                    ? 'forsa-nav-active text-[#0B2C25]'
                    : 'text-white'
                }`
              }
            >
              <span className="flex h-[21px] items-center gap-[9px] whitespace-nowrap">
                <item.icon className="h-[18.5px] w-[18.5px] shrink-0" strokeWidth={1.75} />
                {item.label}
              </span>
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="ml-[15px] block h-[60px] pl-[39px] pt-[10px] text-[13.87px] font-semibold leading-[21px] cursor-default text-white"
            >
              <span className="flex h-[21px] items-center gap-[9px] whitespace-nowrap">
                <item.icon className="h-[18.5px] w-[18.5px] shrink-0" strokeWidth={1.75} />
                {item.label}
              </span>
            </div>
          ),
        )}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="absolute bottom-[54px] left-[37px] flex h-[46px] w-[164px] items-center gap-[15px] rounded-[10.8px] bg-white pl-5 font-poppins text-[13.87px] font-semibold text-[#0B2C25]"
      >
        <LogOut className="h-[18.5px] w-[18.5px]" strokeWidth={1.75} />
        Déconnexion
      </button>
    </aside>
  );
};

export default MerchantSidebar;
