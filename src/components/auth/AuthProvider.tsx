import { createContext, useContext, useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = (token: string) => {
    setAccessToken(token);
    localStorage.setItem('gmail_access_token', token);
  };

  const logout = () => {
    setAccessToken(null);
    localStorage.removeItem('gmail_access_token');
  };

  useEffect(() => {
    const token = localStorage.getItem('gmail_access_token');
    if (token) {
      setAccessToken(token);
    }
  }, []);

  if (!CLIENT_ID) {
    console.error('Google Client ID is not configured');
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!accessToken,
        accessToken,
        login,
        logout,
      }}
    >
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    </AuthContext.Provider>
  );
}