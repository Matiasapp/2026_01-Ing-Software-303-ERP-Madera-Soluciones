import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import { useNotification } from './context/NotificationContext';
import Dashboard from './pages/Dashboard';
import Cobranza from './pages/Cobranza';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';
import Estadisticas from './pages/Estadisticas';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { InventoryProvider } from './context/InventoryContext';
import { BillingProvider } from './context/BillingContext';
import { SalesProvider } from './context/SalesContext';

const App: React.FC = () => {
  const { notifications, dismiss } = useNotification();

  return (
    <>
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      <AnimatePresence>
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
                  : 'border-amber-200 bg-amber-50/95 text-amber-800'
            }`}
          >
            <div className="text-sm font-semibold capitalize">{notification.type}</div>
            <div className="text-sm">{notification.message}</div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <BillingProvider>
              <InventoryProvider>
                <SalesProvider>
                  <Layout />
                </SalesProvider>
              </InventoryProvider>
            </BillingProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cobranza" element={<Cobranza />} />
        <Route
          path="inventario"
          element={
            <ProtectedRoute requiredRole="admin">
              <Inventario />
            </ProtectedRoute>
          }
        />
        <Route path="ventas" element={<Ventas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route
          path="estadisticas"
          element={
            <ProtectedRoute requiredRole="admin">
              <Estadisticas />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute requiredRole="admin">
              <Configuracion />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

export default App;
