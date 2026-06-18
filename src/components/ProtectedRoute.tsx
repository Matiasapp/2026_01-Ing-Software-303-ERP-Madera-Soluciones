import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

type Props = {
  children: React.ReactElement;
  requiredRole?: 'admin' | 'operator';
};

const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(194,125,58,0.08),_transparent_28%),linear-gradient(180deg,_#f9f7f4_0%,_#f5f0eb_100%)]">
        <LoadingSpinner message="Iniciando Madera Soluciones ERP..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
