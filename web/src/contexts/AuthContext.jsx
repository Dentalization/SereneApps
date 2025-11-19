import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, meApi, logoutApi } from '../services/authService';
import { getAccessToken, setTokens, clearTokens } from '../utils/auth/tokenStorage';

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Debug user changes
  useEffect(() => {
    console.log('AuthContext - User changed:', {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      roles: user?.roles,
      timestamp: new Date().toISOString()
    });
  }, [user]);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const userData = await meApi();
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.log('Token validation failed:', error.message);
          // If token expired, clear and redirect to login
          if (error.response?.status === 401) {
            clearTokens();
            setUser(null);
            setIsAuthenticated(false);
            window.location.href = '/login';
            return;
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await loginApi(credentials);
      console.log('Login response:', response);

      const { accessToken, refreshToken, user: loginUser } = response || {};

      if (accessToken && refreshToken) {
        setTokens({ accessToken, refreshToken });
      }

      let hydratedUser = loginUser || null;

      try {
        const userData = await meApi();
        hydratedUser = userData;
      } catch (meError) {
        console.warn('Failed to hydrate user from /auth/me:', meError);
        if (!hydratedUser) {
          throw meError;
        }
      }

      setUser(hydratedUser);
      setIsAuthenticated(true);
      setIsLoading(false);
      return hydratedUser;
    } catch (error) {
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const userData = await meApi();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // If refresh fails due to token expiry, clear tokens and redirect to login
      if (error.response?.status === 401) {
        clearTokens();
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login';
      }
      throw error;
    }
  };

  const clearUserData = () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    setUser, // For updating user data after profile changes
    refreshUserData, // For refreshing user data from server
    clearUserData, // For clearing user data and tokens
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth, AuthProvider };
export default AuthProvider;
