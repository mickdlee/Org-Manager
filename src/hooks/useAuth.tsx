import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, AppUser, UserRole } from '../types';
import {
  loadUsers,
  saveUsers,
  syncUsersFromServer,
  loadSession,
  saveSession,
  clearSession,
} from '../utils/storage';
import { sha256 } from '../utils/crypto';

export interface ManagedUser {
  id: string;
  username: string;
  role: UserRole;
  salaryId?: string;
}

interface AuthContextValue {
  session: Session | null;
  hasUsers: boolean;
  users: ManagedUser[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (username: string, password: string, role: UserRole, salaryId?: string) => Promise<void>;
  updateUser: (id: string, patch: { username?: string; role?: UserRole; password?: string; salaryId?: string }) => Promise<void>;
  deleteUser: (id: string) => void;
  isAdmin: boolean;
  isOrgManager: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [users, setUsers] = useState<AppUser[]>(() => loadUsers());

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const syncedUsers = await syncUsersFromServer(users);
      if (isMounted) {
        setUsers(syncedUsers);
      }
    };
    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasUsers = users.length > 0;
  const isAdmin = session?.role === 'admin';
  const isOrgManager = session?.role === 'orgManager';
  const managedUsers: ManagedUser[] = users.map(({ id, username, role, salaryId }) => ({ id, username, role, salaryId }));

  const normalizeSalaryId = (salaryId?: string): string | undefined => {
    const trimmed = salaryId?.trim() ?? '';
    return trimmed ? trimmed : undefined;
  };

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      const hash = await sha256(password);
      const user = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash,
      );
      if (!user) return false;
      const s: Session = {
        userId: user.id,
        username: user.username,
        role: user.role,
        salaryId: normalizeSalaryId(user.salaryId),
      };
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
    async (username: string, password: string, role: UserRole, salaryId?: string): Promise<void> => {
      const normalizedUsername = username.trim();
      const normalizedSalaryId = normalizeSalaryId(salaryId);
      if (!normalizedUsername) {
        throw new Error('Username is required.');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }
      if (users.some((u) => u.username.toLowerCase() === normalizedUsername.toLowerCase())) {
        throw new Error('A user with this username already exists.');
      }
      if (role === 'orgManager' && !normalizedSalaryId) {
        throw new Error('Salary ID is required for Org Manager users.');
      }

      const hash = await sha256(password);
      const newUser: AppUser = {
        id: crypto.randomUUID(),
        username: normalizedUsername,
        passwordHash: hash,
        role,
        salaryId: normalizedSalaryId,
      };
      const updated = [...users, newUser];
      saveUsers(updated);
      setUsers(updated);
    },
    [users],
  );

  const updateUser = useCallback(
    async (id: string, patch: { username?: string; role?: UserRole; password?: string; salaryId?: string }): Promise<void> => {
      const existing = users.find((u) => u.id === id);
      if (!existing) throw new Error('User not found.');

      const nextUsername = patch.username !== undefined ? patch.username.trim() : existing.username;
      if (!nextUsername) {
        throw new Error('Username is required.');
      }
      if (
        users.some(
          (u) => u.id !== id && u.username.toLowerCase() === nextUsername.toLowerCase(),
        )
      ) {
        throw new Error('A user with this username already exists.');
      }

      const nextRole = patch.role ?? existing.role;
      const nextSalaryId =
        patch.salaryId !== undefined
          ? normalizeSalaryId(patch.salaryId)
          : normalizeSalaryId(existing.salaryId);
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (existing.role === 'admin' && nextRole !== 'admin' && adminCount <= 1) {
        throw new Error('At least one admin user is required.');
      }
      if (nextRole === 'orgManager' && !nextSalaryId) {
        throw new Error('Salary ID is required for Org Manager users.');
      }

      let nextPasswordHash = existing.passwordHash;
      if (patch.password !== undefined && patch.password.length > 0) {
        if (patch.password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        nextPasswordHash = await sha256(patch.password);
      }

      const updatedUsers = users.map((u) =>
        u.id === id
          ? {
              ...u,
              username: nextUsername,
              role: nextRole,
              passwordHash: nextPasswordHash,
              salaryId: nextSalaryId,
            }
          : u,
      );

      saveUsers(updatedUsers);
      setUsers(updatedUsers);

      if (session?.userId === id) {
        const updatedSession: Session = {
          userId: id,
          username: nextUsername,
          role: nextRole,
          salaryId: nextSalaryId,
        };
        saveSession(updatedSession);
        setSession(updatedSession);
      }
    },
    [session, users],
  );

  const deleteUser = useCallback(
    (id: string) => {
      const existing = users.find((u) => u.id === id);
      if (!existing) return;

      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (existing.role === 'admin' && adminCount <= 1) {
        throw new Error('At least one admin user is required.');
      }

      const updatedUsers = users.filter((u) => u.id !== id);
      saveUsers(updatedUsers);
      setUsers(updatedUsers);

      if (session?.userId === id) {
        clearSession();
        setSession(null);
      }
    },
    [session, users],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        hasUsers,
        users: managedUsers,
        login,
        logout,
        createUser,
        updateUser,
        deleteUser,
        isAdmin,
        isOrgManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
