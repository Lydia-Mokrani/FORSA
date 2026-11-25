import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarCheck,
  Plus,
  Star,
  User,
  LogOut,
} from 'lucide-react';
import { logout } from '../../auth/services/authService';

import figmaHomeIcon from '../../../assets/figma/130d6b5b-511f-4704-b0ac-07cdfea16dcd.svg';
import figmaMapIcon from '../../../assets/figma/ed27919e-a9fc-4cff-b9e6-623d372a82b0.svg';
import figmaTicketIcon from '../../../assets/figma/a29e9632-9e75-420f-85ee-e753d97d261d.svg';
import figmaNotifIcon from '../../../assets/figma/4019b4ae-c286-4b45-84a2-fe1374e26ebc.svg';
import figmaUserIcon from '../../../assets/figma/96359338-e7b7-4dc9-91f2-c9adc276dbd9.svg';
import figmaLeafIcon from '../../../assets/figma/bdb66671-e247-4ef5-ae58-f37493cd226c.svg';
import figmaLogoutIcon from '../../../assets/figma/75474ac1-4024-4472-8e3b-dbdad9705688.svg';

interface SidebarItem {
  label: string;
  icon?: React.ElementType;
  svgIcon?: string;
  to?: string;
  badge?: number;
}

interface MerchantSidebarProps {
  variant?: 'merchant' | 'client';
}

const MERCHANT_ITEMS: SidebarItem[] = [
  { label: 'Tableau de bord', icon: LayoutGrid, to: '/merchant/dashboard' },
  { label: 'Réservations', icon: CalendarCheck },
  { label: 'Ajouter une offre', icon: Plus, to: '/merchant/create-offer' },
  { label: 'Avis', icon: Star },
  { label: 'Compte', icon: User, to: '/merchant/account' },
];

const CLIENT_ITEMS: SidebarItem[] = [
  { label: 'Accueil', svgIcon: figmaHomeIcon, to: '/' },
  { label: 'Carte', svgIcon: figmaMapIcon, to: '/map' },
  { label: 'Mes réservations', svgIcon: figmaTicketIcon, to: '/reservations', badge: 2 },
  { label: 'Notifications', svgIcon: figmaNotifIcon, to: '/notifications', badge: 3 },
  { label: 'Profil', svgIcon: figmaUserIcon, to: '/profile' },
];

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  variant = 'merchant',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  if (variant === 'client') {
    return (
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[238px] rounded-r-[31px] bg-[#0B2C25] shadow-[10px_11px_72px_rgba(0,0,0,0.18)] md:flex flex-col justify-between select-none"
        data-node-id="617:18233"
        data-name="Sidebar Client PC"
      >
        <div>
          {/* Logo FORSA */}
          <Link
            to="/"
            className="block pl-[75px] pt-[68px] font-extrabold text-[18.5px] leading-normal text-white tracking-wide"
            data-node-id="617:18234"
          >
            FORSA
          </Link>

          {/* Navigation */}
          <nav className="mt-[90px] flex flex-col gap-[10px] pl-[20px]" data-node-id="617:18235">
            {CLIENT_ITEMS.map((item) => {
              const isProfileActive =
                item.label === 'Profil' &&
                (location.pathname.startsWith('/profile') ||
                  location.pathname.startsWith('/settings') ||
                  location.pathname.startsWith('/location'));

              const isStandardActive = location.pathname === item.to;
              const isActive = isProfileActive || isStandardActive;

              return (
                <NavLink
                  key={item.label}
                  to={item.to || '/'}
                  className={`relative flex items-center gap-[14px] h-[56px] pl-[34px] pr-[16px] rounded-l-[29px] transition-colors ${
                    isActive
                      ? 'bg-[#fffaf0] text-[#0b2c25]'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {/* Icône SVG officielle Figma */}
                  <div className="size-[22px] shrink-0 flex items-center justify-center">
                    <img
                      src={item.svgIcon}
                      alt=""
                      className={`size-[22px] object-contain ${
                        isActive ? 'brightness-0' : 'brightness-0 invert'
                      }`}
                    />
                  </div>

                  <span
                    className={`font-semibold text-[14px] leading-normal whitespace-nowrap ${
                      isActive ? 'text-[#0b2c25]' : 'text-white'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Pastille numérique jaune Figma (Frame 635:16800 / 635:16802) */}
                  {item.badge !== undefined && (
                    <div className="ml-auto bg-[#edbd4d] text-[#0b2c25] text-[10px] font-semibold px-[6px] h-[19px] rounded-[10px] flex items-center justify-center shrink-0">
                      {item.badge}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bas de sidebar : Impact note & Déconnexion */}
        <div className="px-[36px] pb-[54px] flex flex-col gap-[28px]" data-node-id="617:18255">
          {/* Impact note (617:18256) */}
          <div className="flex items-start gap-[10px]" data-node-id="617:18256">
            <img src={figmaLeafIcon} alt="" className="size-[24px] shrink-0" />
            <p className="font-normal text-[12px] leading-[1.5] text-[#dbf0dd]">
              Moins de gaspillage, plus de bonnes choses.
            </p>
          </div>

          {/* Bouton Déconnexion (617:18260) */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-[46px] rounded-[11px] bg-white hover:bg-stone-50 text-[#0b2c25] font-semibold text-[13px] flex items-center justify-center gap-[10px] px-[18px] transition cursor-pointer shadow-xs"
            data-node-id="617:18260"
          >
            <img src={figmaLogoutIcon} alt="" className="size-[18px] shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    );
  }

  // Merchant variant
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] rounded-r-[31px] bg-[#0B2C25] shadow-[10px_11px_72px_rgba(0,0,0,0.18)] md:block">
      <Link
        to="/merchant/dashboard"
        className="absolute left-[75px] top-[71px] font-poppins text-[18.49px] font-extrabold leading-[28px] text-white"
      >
        FORSA
      </Link>

      <nav className="absolute inset-x-0 top-[190px] flex flex-col gap-[3px]">
        {MERCHANT_ITEMS.map((item) => {
          const Icon = item.icon || LayoutGrid;
          return item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `ml-[15px] h-[60px] pl-[39px] pt-[10px] text-[13.87px] font-semibold leading-[21px] block ${
                  isActive
                    ? 'forsa-nav-active text-[#0B2C25]'
                    : 'text-white'
                }`
              }
            >
              <span className="flex h-[21px] items-center gap-[9px] whitespace-nowrap">
                <Icon className="h-[18.5px] w-[18.5px] shrink-0" strokeWidth={1.75} />
                {item.label}
              </span>
            </NavLink>
          ) : (
            <div
              key={item.label}
              className="ml-[15px] h-[60px] pl-[39px] pt-[10px] text-[13.87px] font-semibold leading-[21px] cursor-default text-white"
            >
              <span className="flex h-[21px] items-center gap-[9px] whitespace-nowrap">
                <Icon className="h-[18.5px] w-[18.5px] shrink-0" strokeWidth={1.75} />
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="absolute bottom-[54px] left-[37px] flex h-[46px] w-[164px] items-center gap-[15px] rounded-[10.8px] bg-white pl-5 font-poppins text-[13.87px] font-semibold text-[#0B2C25] cursor-pointer hover:bg-stone-50 transition-colors shadow-xs"
      >
        <LogOut className="h-[18.5px] w-[18.5px]" strokeWidth={1.75} />
        Déconnexion
      </button>
    </aside>
  );
};

export default MerchantSidebar;
