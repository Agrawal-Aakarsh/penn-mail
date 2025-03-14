import { useState } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import { LoginPage } from './components/auth/LoginPage'
import { Dashboard } from './components/dashboard/Dashboard'
import { EmailProvider } from './lib/EmailContext'

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
