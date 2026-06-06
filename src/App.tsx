import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cobranza from './pages/Cobranza';
import Inventario from './pages/Inventario';
import Ventas from './pages/Ventas';
import Clientes from './pages/Clientes';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { InventoryProvider } from './context/InventoryContext';
import { BillingProvider } from './context/BillingContext';
import { SalesProvider } from './context/SalesContext';

const App: React.FC = () => {
  return (
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
