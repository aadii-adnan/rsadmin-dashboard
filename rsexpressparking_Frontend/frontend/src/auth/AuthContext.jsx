import { createContext, useContext, useEffect, useState } from 'react';
import { useBooking } from "../context/BookingContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const { setBookingData, bookingData } = useBooking();

  useEffect(() => {
    const storedUser = bookingData?.userDetails
    if (storedUser?.id) {
      setUser(storedUser);
    }
  }, []);

  const login = async (username, password) => {
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

    const profileData = await profile.json();
    setBookingData((prev) => ({
      ...prev,
      userDetails: profileData,
    }));
    setUser(profileData);
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
