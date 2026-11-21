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
import {
  figmaNavHome,
  figmaNavMap,
  figmaNavReservations,
  figmaNavNotifications,
  figmaNavProfile,
  figmaLeaf,
  figmaLogout,
} from '../../profile/figmaAssets';

interface MerchantSidebarProps {
  variant?: 'merchant' | 'client';
}

const MERCHANT_ITEMS = [
  { label: 'Tableau de bord', icon: LayoutGrid, to: '/merchant/dashboard' },
  { label: 'Réservations', icon: CalendarCheck },
  { label: 'Ajouter une offre', icon: Plus, to: '/merchant/create-offer' },
  { label: 'Avis', icon: Star },
  { label: 'Compte', icon: User, to: '/profile' },
];

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  variant = 'merchant',
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('forsa_auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // ── CLIENT SIDEBAR (EXACT FIGMA 617:18233) ──
  if (variant === 'client') {
    return (
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] rounded-br-[31px] rounded-tr-[31px] bg-[#0B2C25] font-poppins md:block">
        {/* Logo FORSA */}
        <Link
          to="/"
          className="absolute left-[75px] top-[68px] text-[18.5px] font-extrabold text-white tracking-wide"
        >
          FORSA
        </Link>

        {/* Navigation Items */}
        <nav className="absolute left-0 top-[186px] flex flex-col gap-[10px] pl-[20px] w-full">
          {/* Accueil */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex h-[56px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
              }`
            }
          >
            <img src={figmaNavHome} alt="" className="size-[22px] shrink-0" />
            <span className="text-[14px] font-semibold">Accueil</span>
          </NavLink>

          {/* Carte */}
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `flex h-[56px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
              }`
            }
          >
            <img src={figmaNavMap} alt="" className="size-[22px] shrink-0" />
            <span className="text-[14px] font-semibold">Carte</span>
          </NavLink>

          {/* Mes réservations */}
          <div className="relative flex h-[56px] w-[218px] items-center gap-[14px] pl-[34px] text-white cursor-pointer hover:bg-white/10 rounded-bl-[29px] rounded-tl-[29px] transition">
            <img src={figmaNavReservations} alt="" className="size-[22px] shrink-0" />
            <span className="text-[14px] font-semibold whitespace-nowrap">Mes réservations</span>
            <div className="ml-auto mr-4 flex h-[19px] items-center justify-center rounded-[10px] bg-[#EDBD4D] px-[6px] text-[10px] font-semibold text-[#0B2C25]">
              2
            </div>
          </div>

          {/* Notifications */}
          <div className="relative flex h-[56px] w-[218px] items-center gap-[14px] pl-[34px] text-white cursor-pointer hover:bg-white/10 rounded-bl-[29px] rounded-tl-[29px] transition">
            <img src={figmaNavNotifications} alt="" className="size-[22px] shrink-0" />
            <span className="text-[14px] font-semibold">Notifications</span>
            <div className="ml-auto mr-4 flex h-[19px] items-center justify-center rounded-[10px] bg-[#EDBD4D] px-[6px] text-[10px] font-semibold text-[#0B2C25]">
              3
            </div>
          </div>

          {/* Profil */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex h-[56px] w-[218px] items-center gap-[14px] pl-[34px] rounded-bl-[29px] rounded-tl-[29px] transition ${
                isActive ? 'bg-[#FFFAF0] text-[#0B2C25]' : 'text-white hover:bg-white/10'
              }`
            }
          >
            <img src={figmaNavProfile} alt="" className="size-[22px] shrink-0" />
            <span className="text-[14px] font-semibold">Profil</span>
          </NavLink>
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-[54px] left-[36px] flex w-[166px] flex-col gap-[65px]">
          {/* Impact note */}
          <div className="flex gap-[10px] items-start">
            <img src={figmaLeaf} alt="" className="size-[24px] shrink-0" />
            <p className="text-[12px] font-normal leading-[1.5] text-[#DBF0DD]">
              Moins de gaspillage, plus de bonnes choses.
            </p>
          </div>

          {/* Déconnexion */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[46px] w-full items-center justify-center gap-[10px] rounded-[11px] bg-white px-[18px] text-[13px] font-semibold text-[#0B2C25] shadow-sm hover:bg-[#EEF7EC] transition"
          >
            <img src={figmaLogout} alt="" className="size-[18px] shrink-0" />
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
