import { createContext, useContext, useEffect, useState } from 'react';
import { useBooking } from "../context/BookingContext";
import customFetch, { isUsableToken } from './fetch';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setBookingData } = useBooking();

  useEffect(() => {
    let isMounted = true;

    const clearLocalProfile = () => {
      if (!isMounted) return;
      setUser(null);
      setBookingData((prev) => ({
        ...prev,
        userDetails: null,
      }));
    };

    const restoreSession = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!isUsableToken(accessToken)) {
        clearLocalProfile();
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await customFetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me/`);
        if (!response?.ok) {
          clearLocalProfile();
          return;
        }

        const profile = await response.json();
        if (!isMounted) return;
        setUser(profile);
        setBookingData((prev) => ({
          ...prev,
          userDetails: profile,
        }));
      } catch {
        clearLocalProfile();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [setBookingData]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error('Invalid username or password');

      const data = await res.json();
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      const profile = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      if (!profile.ok) throw new Error('Unable to load your account profile');

      const profileData = await profile.json();
      setBookingData((prev) => ({
        ...prev,
        userDetails: profileData,
      }));
      setUser(profileData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setBookingData((prev) => ({
      ...prev,
      userDetails: null,
    }));
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
