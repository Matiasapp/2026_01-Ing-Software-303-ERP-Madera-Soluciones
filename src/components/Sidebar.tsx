import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInventory } from '../context/InventoryContext';

const allLinks = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/cobranza', label: 'Cobranza', icon: WalletIcon },
  { to: '/inventario', label: 'Inventario', icon: InventoryIcon },
  { to: '/ventas', label: 'Ventas', icon: SalesIcon },
  { to: '/clientes', label: 'Clientes', icon: UsersIcon },
];

const permissions: Record<string, string[]> = {
  admin: allLinks.map(l => l.to),
  operator: allLinks.filter(l => l.to !== '/inventario').map(l => l.to),
};

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const { lowStockCount } = useInventory();
  const role = user?.role ?? 'operator';
  const allowed = permissions[role] ?? [];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] px-4 py-6 shadow-[12px_0_35px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-950 px-4 py-4 text-white shadow-[0_20px_40px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
              Cercotec ERP
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Gestión premium</h1>
            <p className="mt-1 text-sm text-slate-300">Sistema para ferretería y ventas</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>
      </div>

      <nav className="space-y-1.5">
        {allLinks
          .filter(l => allowed.includes(l.to))
          .map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `group flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition duration-200 ${
                  isActive
                    ? 'border-blue-200 bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)]'
                    : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:shadow-sm'
                }`
              }
              end={l.to === '/'}
              onClick={onClose}
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition duration-200 ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : l.to === '/inventario' && lowStockCount > 0
                            ? 'bg-rose-100 text-rose-700 group-hover:bg-rose-200'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-white'
                      }`}
                    >
                      <l.icon active={isActive} />
                    </span>
                    <span>{l.label}</span>
                  </span>
                  {l.to === '/inventario' && lowStockCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {lowStockCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Sesión activa
        </div>
        <div className="mt-2 text-sm font-medium text-slate-900">{user?.email}</div>
        <div className="text-sm text-slate-500">Rol: {user?.role}</div>
        <button
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          onClick={logout}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};

type IconProps = { active?: boolean };

function DashboardIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${active ? 'text-white' : ''}`}>
      <path
        d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM13 4v5h7V4h-7ZM4 20h7v-5H4v5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function WalletIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${active ? 'text-white' : ''}`}>
      <path
        d="M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2 2 0 0 1 2 2v2h-5.5A2.5 2.5 0 0 0 12 11.5v1A2.5 2.5 0 0 0 14.5 15H20v2a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

function InventoryIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${active ? 'text-white' : ''}`}>
      <path
        d="M4 7.5 12 4l8 3.5V16l-8 4-8-4V7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.8" opacity="0.55" />
    </svg>
  );
}

function SalesIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${active ? 'text-white' : ''}`}>
      <path
        d="M5 19V5m0 14h14M8 15l3-4 3 2 4-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${active ? 'text-white' : ''}`}>
      <path
        d="M17 21v-1.2c0-2.1-1.8-3.8-4-3.8H11c-2.2 0-4 1.7-4 3.8V21m5-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Sidebar;
