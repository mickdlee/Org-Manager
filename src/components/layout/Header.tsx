import { LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; to?: string }[];
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const { session, logout } = useAuth();

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex flex-col justify-center min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {bc.to ? (
                  <Link to={bc.to} className="hover:underline text-gray-500 hover:text-gray-700">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-gray-600">{bc.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-base font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={14} />
          <span>{session?.username}</span>
          <Badge color={session?.role === 'admin' ? 'blue' : 'gray'}>{session?.role}</Badge>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </header>
  );
}
