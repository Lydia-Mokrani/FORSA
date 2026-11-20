import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutGrid, CalendarCheck, Plus, Star, User, LogOut } from 'lucide-react';

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  to?: string; // no route yet = page not built
}

const ITEMS: SidebarItem[] = [
  { label: 'Tableau de bord', icon: LayoutGrid, to: '/merchant/dashboard' },
  { label: 'Réservations', icon: CalendarCheck },
  { label: 'Ajouter une offre', icon: Plus, to: '/merchant/create-offer' },
  { label: 'Avis', icon: Star },
  { label: 'Compte', icon: User },
];

// Figma: items every 63px (60px row + 3px gap), icon x=75, text 13.87px semibold
const rowBase = 'ml-[21px] h-[60px] pl-[54px] pt-[10px] text-[13.87px] font-semibold leading-[21px]';

const ItemContent: React.FC<{ item: SidebarItem }> = ({ item }) => {
  const Icon = item.icon;
  return (
    <span className="flex h-[21px] items-center gap-[9px]">
      <Icon className="h-[18.5px] w-[18.5px]" strokeWidth={1.75} />
      {item.label}
    </span>
  );
};

export const MerchantSidebar: React.FC = () => (
  <aside className="fixed inset-y-0 left-0 z-30 w-[238px] rounded-r-[48px] bg-forsa-green shadow-[10px_11px_72px_rgba(0,0,0,0.18)]">
    <Link
      to="/merchant/dashboard"
      className="absolute left-[75px] top-[71px] text-[18.49px] font-extrabold leading-[28px] text-white"
    >
      FORSA
    </Link>

    <nav className="absolute inset-x-0 top-[190px] flex flex-col gap-[3px]">
      {ITEMS.map((item) =>
        item.to ? (
          <NavLink
            key={item.label}
            to={item.to}
            end
            className={({ isActive }) =>
              `${rowBase} block ${isActive ? 'forsa-nav-active text-forsa-green' : 'text-white'}`
            }
          >
            <ItemContent item={item} />
          </NavLink>
        ) : (
          <div key={item.label} className={`${rowBase} cursor-default text-white`}>
            <ItemContent item={item} />
          </div>
        )
      )}
    </nav>

    {/* TODO: connect to the real logout once authentication exists */}
    <button
      type="button"
      className="absolute bottom-[54px] left-[37px] flex h-[46px] w-[164px] items-center gap-[15px] rounded-[10.8px] bg-white pl-5 text-[13.87px] font-semibold text-forsa-green"
    >
      <LogOut className="h-[18.5px] w-[18.5px]" strokeWidth={1.75} />
      Déconnexion
    </button>
  </aside>
);
