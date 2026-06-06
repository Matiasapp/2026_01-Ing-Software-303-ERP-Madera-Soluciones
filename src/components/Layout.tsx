import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import PageTransition from './PageTransition';
import { useBilling } from '../context/BillingContext';
import { useInventory } from '../context/InventoryContext';
import { useSales } from '../context/SalesContext';
import LoadingSpinner from './LoadingSpinner';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isLoading: billingLoading } = useBilling();
  const { isLoading: inventoryLoading } = useInventory();
  const { isLoading: salesLoading } = useSales();
  const { notifications, dismiss } = useNotification();
  const location = useLocation();
  const isPageLoading = billingLoading || inventoryLoading || salesLoading;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] text-slate-900 lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:min-w-0">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
              >
                ☰
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Cercotec ERP
                </p>
                <h1 className="text-base font-semibold text-slate-900">
                  {user?.role === 'admin' ? 'Panel administrador' : 'Panel operador'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  Perfil
                </summary>
                <div className="absolute right-0 mt-2 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
                  <button
                    type="button"
                    className="w-full rounded-2xl px-3 py-2 text-left text-sm text-slate-700 transition duration-200 hover:bg-slate-50"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname} className="min-w-0">
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {isPageLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/75 backdrop-blur-sm">
          <LoadingSpinner message="Sincronizando datos desde Supabase..." />
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {notifications.map(notification => (
          <motion.button
            key={notification.id}
            type="button"
            onClick={() => dismiss(notification.id)}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.24 }}
            whileHover={{ scale: 1.02 }}
            className={`pointer-events-auto w-full max-w-sm rounded-3xl border px-4 py-3 text-left shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur ${
              notification.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
                : notification.type === 'error'
                  ? 'border-rose-200 bg-rose-50/95 text-rose-800'
                  : 'border-sky-200 bg-sky-50/95 text-sky-800'
            }`}
          >
            <div className="text-sm font-semibold capitalize">{notification.type}</div>
            <div className="text-sm">{notification.message}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default Layout;
