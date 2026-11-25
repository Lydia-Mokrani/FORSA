
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarCheck,
  Plus,
  Star,
  User,
  LogOut,
  MapPin,
  Bell,
} from 'lucide-react';
import { logout } from '../../auth/services/authService';

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  to?: string;
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
  { label: 'Accueil', icon: LayoutGrid, to: '/' },
  { label: 'Carte', icon: MapPin, to: '/map' },
  { label: 'Mes réservations', icon: CalendarCheck },
  { label: 'Notifications', icon: Bell },
  { label: 'Compte', icon: User },
];

const rowBase =
  'ml-[15px] h-[60px] pl-[39px] pt-[10px] text-[13.87px] font-semibold leading-[21px]';

const ItemContent: React.FC<{ item: SidebarItem }> = ({ item }) => {
  const Icon = item.icon;

  return (
    <span className="flex h-[21px] items-center gap-[9px] whitespace-nowrap">
      <Icon className="h-[18.5px] w-[18.5px] shrink-0" strokeWidth={1.75} />
      {item.label}
    </span>
  );
};

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  variant = 'merchant',
}) => {
  const navigate = useNavigate();
  const items = variant === 'client' ? CLIENT_ITEMS : MERCHANT_ITEMS;

  const homePath =
    variant === 'client' ? '/' : '/merchant/dashboard';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] rounded-r-[31px] bg-[#0B2C25] shadow-[10px_11px_72px_rgba(0,0,0,0.18)] md:block">
      <Link
        to={homePath}
        className="absolute left-[75px] top-[71px] font-poppins text-[18.49px] font-extrabold leading-[28px] text-white"
      >
        FORSA
      </Link>

      <nav className="absolute inset-x-0 top-[190px] flex flex-col gap-[3px]">
        {items.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={({ isActive }) =>
                `${rowBase} block ${
                  isActive
                    ? 'forsa-nav-active text-[#0B2C25]'
                    : 'text-white'
                }`
              }
            >
              <ItemContent item={item} />
            </NavLink>
          ) : (
            <div
              key={item.label}
              className={`${rowBase} cursor-default text-white`}
            >
              <ItemContent item={item} />
            </div>
          ),
        )}
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
