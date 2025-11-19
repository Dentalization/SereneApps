import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';

const ProtectedRoute = ({ allow = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userRoles = user?.roles || [];
  if (allow.length && !userRoles.some((r) => allow.includes(r))) {
    console.log('ProtectedRoute: Access denied. User roles:', userRoles, 'Required roles:', allow);
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Access granted. User roles:', userRoles, 'Required roles:', allow);
  return <Outlet />;
};

export default ProtectedRoute;

