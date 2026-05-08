import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';

interface LayoutProps {
  title: string;
  breadcrumbs?: { label: string; to?: string }[];
  children: ReactNode;
}

export function Layout({ title, breadcrumbs, children }: LayoutProps) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/** Redirects to /login if not authenticated */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
