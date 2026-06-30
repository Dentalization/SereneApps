import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { hasAdminAccess } from './adminAccess';

const AdminRouteGate = ({ allow, children }) => {
  const { user } = useAuth();
  if (!hasAdminAccess(user, allow)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default AdminRouteGate;
