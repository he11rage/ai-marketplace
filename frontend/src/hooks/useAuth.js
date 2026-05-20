import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiEndpoints } from '../api/axios';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Login uses username (not email) for Djoser JWT endpoint.
  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiEndpoints.login({ username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      navigate('/');
      return response.data;
    } catch (err) {
      setError(err.response?.data || 'Ошибка входа');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiEndpoints.register(userData);
      // Auto login after registration
      await login(userData.username, userData.password);
    } catch (err) {
      setError(err.response?.data || 'Ошибка регистрации');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return { login, register, logout, isLoading, error };
}