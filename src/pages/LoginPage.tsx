import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const { session, hasUsers, login, createUser } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  const isSetup = !hasUsers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('All fields are required.'); return; }

    setLoading(true);
    try {
      if (isSetup) {
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        await createUser(username.trim(), password, 'admin');
        await login(username.trim(), password);
      } else {
        const ok = await login(username.trim(), password);
        if (!ok) setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={32} />
            <span className="text-2xl font-bold">Org Manager</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {isSetup ? 'Create Admin Account' : 'Sign In'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isSetup
              ? 'No users exist yet. Set up the first admin account to get started.'
              : 'Enter your credentials to continue.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
            />
            <Input
              label="Password"
              type="password"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {isSetup && (
              <Input
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Please wait…' : isSetup ? 'Create Account & Sign In' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
