// frontend/src/features/profile/ProfileCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { User, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, Store } from 'lucide-react';
import { UserProfile } from './types';

interface ProfileCardProps {
  user: UserProfile;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user, className = '' }) => {
  const isMerchant = user.role === 'MERCHANT';

  return (
    <div
      style={{ width: '388px', height: '185px' }}
      className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0B2C25] via-[#103D33] to-[#17664E] p-4 text-white shadow-xl shadow-[#0B2C25]/20 flex flex-col justify-between border border-emerald-500/20 ${className}`}
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />

      {/* Header: Avatar, Name, Role badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-emerald-950/60 border-2 border-emerald-400/30 flex items-center justify-center text-emerald-200 font-bold text-xl shadow-inner">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</span>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-base font-bold text-white tracking-tight truncate leading-tight">
              {user.fullName || 'Utilisateur FORSA'}
            </h4>
            <p className="text-xs text-emerald-200/80 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                isMerchant 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {isMerchant ? <Store size={10} /> : <User size={10} />}
                {isMerchant ? 'Commerçant' : 'Client Solidaire'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Security / Status icon */}
        <div title={user.status === 'SUSPENDED' ? 'Compte Suspendu' : 'Compte Actif'}>
          {user.status === 'SUSPENDED' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#B22222]/80 text-white border border-[#B22222]">
              Suspendu
            </span>
          ) : (
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <ShieldCheck size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Badges verification */}
      <div className="flex items-center gap-2 pt-1">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
            user.emailVerified
              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
              : 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
          }`}
        >
          {user.emailVerified ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : (
            <AlertCircle size={12} className="text-amber-400" />
          )}
          {user.emailVerified ? 'Email vérifié' : 'Email non vérifié'}
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
            user.phoneVerified
              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
              : 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
          }`}
        >
          {user.phoneVerified ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : (
            <AlertCircle size={12} className="text-amber-400" />
          )}
          {user.phoneVerified ? 'Téléphone vérifié' : 'Téléphone non vérifié'}
        </span>
      </div>

      {/* Footer: Quick Action Link */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-[11px] text-emerald-200/70 truncate">
          {user.phone ? `Tél: +213 ${user.phone}` : 'Tél: Non renseigné'}
        </span>

        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-white transition group"
        >
          <span>Gérer</span>
          <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
