import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthProvider';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useAuth();

  const googleLogin = useGoogleLogin({
    onSuccess: (response) => {
      login(response.access_token);
      onLogin(response.access_token);
    },
    onError: () => {
      console.error('Login Failed');
    },
    scope: 'https://www.googleapis.com/auth/gmail.modify',
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to PennMail</h1>
          <p className="text-muted-foreground">Sign in with your Google account to continue</p>
        </div>
        <div className="flex justify-center pt-4">
          <button
            onClick={() => googleLogin()}
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
} 