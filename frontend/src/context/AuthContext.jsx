import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem('rinci_auth') === 'true'
  );
  const [error, setError] = useState('');

  const login = (username, password) => {
    if (username === 'user' && password === 'user') {
      setIsLoggedIn(true);
      setError('');
      localStorage.setItem('rinci_auth', 'true');
      return true;
    } else {
      setError('Username atau password salah');
      return false;
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('rinci_auth');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
