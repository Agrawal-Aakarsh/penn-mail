import { useState } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import { LoginPage } from './components/auth/LoginPage'
import { Dashboard } from './components/dashboard/Dashboard'
import { EmailProvider } from './lib/EmailContext'
import { ThemeProvider } from './components/ThemeProvider'

function AppContent() {
  const { isAuthenticated, accessToken, login } = useAuth();

  const handleLogin = (token: string) => {
    login(token);
  };

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        accessToken && (
          <EmailProvider accessToken={accessToken}>
            <Dashboard />
          </EmailProvider>
        )
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App
