import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, ChevronRight, Building2, Train, Shield } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const { data } = useAppStore();
  const { isAdmin } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
      isActive
        ? 'bg-secondary/10 text-secondary'
        : 'text-gray-100 hover:bg-white/10'
    }`;

  return (
    <aside className="w-60 shrink-0 bg-primary flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-white">
          <Shield size={20} className="shrink-0" />
          <span className="font-semibold text-sm leading-tight">Org Manager</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        <NavLink to="/people" className={navLinkClass}>
          <Users size={16} />
          People
        </NavLink>

        {/* Delivery Units tree */}
        {data.deliveryUnits.length > 0 && (
          <div className="pt-2">
            <p className="px-3 mb-1 text-xs font-bold uppercase tracking-wider text-white/40">
              Delivery Units
            </p>
            {data.deliveryUnits.map((du) => (
              <div key={du.id}>
                <NavLink to={`/delivery-units/${du.id}`} className={navLinkClass}>
                  <Building2 size={14} />
                  <span className="truncate">{du.name}</span>
                </NavLink>
                {du.releaseTrains.map((rt) => (
                  <div key={rt.id} className="pl-4">
                    <NavLink to={`/release-trains/${du.id}/${rt.id}`} className={navLinkClass}>
                      <ChevronRight size={12} className="shrink-0" />
                      <Train size={13} />
                      <span className="truncate">{rt.name}</span>
                    </NavLink>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="pt-2">
            <p className="px-3 mb-1 text-xs font-bold uppercase tracking-wider text-white/40">
              Admin
            </p>
            <NavLink to="/settings" className={navLinkClass}>
              <Shield size={16} />
              Settings
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}
