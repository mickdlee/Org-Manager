import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Session, AppUser, UserRole } from '../types';
import {
  loadUsers,
  saveUsers,
  loadSession,
  saveSession,
  clearSession,
} from '../utils/storage';
import { sha256 } from '../utils/crypto';

interface AuthContextValue {
  session: Session | null;
  hasUsers: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (username: string, password: string, role: UserRole) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());

  const hasUsers = users.length > 0;
  const isAdmin = session?.role === 'admin';

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const hash = await sha256(password);
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash,
      );
      if (!user) return false;
      const s: Session = { userId: user.id, username: user.username, role: user.role };
      saveSession(s);
      setSession(s);
      return true;
    },
    [users],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const createUser = useCallback(
    async (username: string, password: string, role: UserRole): Promise<void> => {
      const hash = await sha256(password);
      const newUser: AppUser = {
        id: crypto.randomUUID(),
        username,
        passwordHash: hash,
        role,
      };
      const updated = [...users, newUser];
      saveUsers(updated);
      setUsers(updated);
    },
    [users],
  );

  return (
    <AuthContext.Provider value={{ session, hasUsers, login, logout, createUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
