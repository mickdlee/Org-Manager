import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ChevronDown, ChevronRight, Building2, Train, Users2, Shield, Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar() {
  const { data } = useAppStore();
  const { isAdmin } = useAuth();
  const location = useLocation();

  // Derive which DU and RT are active from the current URL so we can auto-expand
  const pathParts = location.pathname.split('/');
  // routes: /delivery-units/:duId  /release-trains/:duId/:rtId  /squads/:duId/:rtId/:sqId
  let activeDuId: string | null = null;
  let activeRtId: string | null = null;
  if (pathParts[1] === 'delivery-units')  { activeDuId = pathParts[2] ?? null; }
  if (pathParts[1] === 'release-trains')  { activeDuId = pathParts[2] ?? null; activeRtId = pathParts[3] ?? null; }
  if (pathParts[1] === 'squads')          { activeDuId = pathParts[2] ?? null; activeRtId = pathParts[3] ?? null; }

  const [expandedDUs, setExpandedDUs] = useState<Set<string>>(new Set());
  const [expandedRTs, setExpandedRTs] = useState<Set<string>>(new Set());

  // Auto-expand the active DU / RT when navigation changes
  useEffect(() => {
    if (activeDuId) setExpandedDUs((s) => new Set(s).add(activeDuId!));
    if (activeRtId) setExpandedRTs((s) => new Set(s).add(activeRtId!));
  }, [activeDuId, activeRtId]);

  const toggleDU = (id: string) =>
    setExpandedDUs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleRT = (id: string) =>
    setExpandedRTs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const linkBase = 'flex items-center gap-2 rounded text-sm font-medium transition-colors truncate';
  const linkActive = 'bg-secondary/20 text-white';
  const linkIdle = 'text-gray-300 hover:bg-white/10 hover:text-white';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkBase} px-3 py-1.5 ${isActive ? linkActive : linkIdle}`;

  return (
    <aside className="w-64 shrink-0 bg-primary flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-white">
          <Shield size={20} className="shrink-0" />
          <span className="font-semibold text-sm leading-tight">Org Manager</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <NavLink to="/dashboard" end className={navLinkClass}>
          <LayoutDashboard size={15} className="shrink-0" />
          Dashboard
        </NavLink>

        <NavLink to="/people" className={navLinkClass}>
          <Users size={15} className="shrink-0" />
          People
        </NavLink>

        {/* Delivery Units tree */}
        {data.deliveryUnits.length > 0 && (
          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-white/40">
              Delivery Units
            </p>

            {data.deliveryUnits.map((du) => {
              const duExpanded = expandedDUs.has(du.id);

              return (
                <div key={du.id}>
                  {/* DU row: chevron toggle + nav link */}
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleDU(du.id)}
                      className="shrink-0 p-1.5 text-gray-400 hover:text-white transition-colors"
                      aria-label={duExpanded ? 'Collapse' : 'Expand'}
                    >
                      {duExpanded
                        ? <ChevronDown size={12} />
                        : <ChevronRight size={12} />}
                    </button>
                    <NavLink
                      to={`/delivery-units/${du.id}`}
                      className={({ isActive }) =>
                        `flex-1 flex items-center gap-1.5 py-1.5 pr-2 rounded text-sm font-medium transition-colors truncate ${isActive ? linkActive : linkIdle}`
                      }
                    >
                      <Building2 size={13} className="shrink-0" />
                      <span className="truncate">{du.name}</span>
                    </NavLink>
                  </div>

                  {/* Release Trains */}
                  {duExpanded && du.releaseTrains.map((rt) => {
                    const rtExpanded = expandedRTs.has(rt.id);

                    return (
                      <div key={rt.id} className="pl-5">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleRT(rt.id)}
                            className="shrink-0 p-1.5 text-gray-400 hover:text-white transition-colors"
                            aria-label={rtExpanded ? 'Collapse' : 'Expand'}
                          >
                            {rtExpanded
                              ? <ChevronDown size={11} />
                              : <ChevronRight size={11} />}
                          </button>
                          <NavLink
                            to={`/release-trains/${du.id}/${rt.id}`}
                            className={({ isActive }) =>
                              `flex-1 flex items-center gap-1.5 py-1.5 pr-2 rounded text-sm transition-colors truncate ${isActive ? linkActive : linkIdle}`
                            }
                          >
                            <Train size={12} className="shrink-0" />
                            <span className="truncate">{rt.name}</span>
                          </NavLink>
                        </div>

                        {/* Squads */}
                        {rtExpanded && rt.squads.map((sq) => (
                          <div key={sq.id} className="pl-5">
                            <NavLink
                              to={`/squads/${du.id}/${rt.id}/${sq.id}`}
                              className={({ isActive }) =>
                                `flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors truncate ${isActive ? linkActive : 'text-gray-400 hover:bg-white/10 hover:text-white'}`
                              }
                            >
                              <Users2 size={11} className="shrink-0" />
                              <span className="truncate">{sq.name}</span>
                            </NavLink>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <div className="pt-3">
            <p className="px-3 pb-1 text-xs font-bold uppercase tracking-wider text-white/40">
              Admin
            </p>
            <NavLink to="/settings" className={navLinkClass}>
              <Settings size={15} className="shrink-0" />
              Settings
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}
