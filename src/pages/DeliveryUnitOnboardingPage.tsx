import { useParams, Navigate, Link } from 'react-router-dom';
import { Users, Briefcase, UserMinus, TrendingUp } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { canManageDeliveryUnit } from '../utils/permissions';
import type { DeliveryUnitOnboarding } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

const HEALTH_COLORS: Record<string, { bg: string; text: string; badge: 'blue' | 'amber' | 'red' }> = {
  Healthy: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', badge: 'blue' },
  Attention: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', badge: 'amber' },
  Critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', badge: 'red' },
};

function emptyOnboarding(): DeliveryUnitOnboarding {
  return {
    overallHealthStatus: 'Healthy',
    totalNewHires: 0,
    totalOpenRoles: 0,
    totalPendingOffboarding: 0,
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function DeliveryUnitOnboardingPage() {
  const { duId } = useParams<{ duId: string }>();
  const { data, updateDeliveryUnitOnboarding } = useAppStore();
  const { session } = useAuth();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  if (!du) return <Navigate to="/dashboard" replace />;
  const canEditDU = canManageDeliveryUnit(data, session, du.id);

  const ob: DeliveryUnitOnboarding = du.onboarding ?? emptyOnboarding();
  const healthMeta = HEALTH_COLORS[ob.overallHealthStatus ?? 'Healthy'];

  const save = (next: DeliveryUnitOnboarding) => updateDeliveryUnitOnboarding(du.id, next);

  // Aggregate metrics from all squads
  const allSquads = du.releaseTrains.flatMap((rt) => rt.squads);
  const totalScheduledOffboarding =
    du.assignments.filter((a) => a.isScheduledOffboarding).length +
    du.releaseTrains.reduce(
      (sum, rt) =>
        sum +
        rt.assignments.filter((a) => a.isScheduledOffboarding).length +
        rt.squads.reduce((sqSum, sq) => sqSum + sq.assignments.filter((a) => a.isScheduledOffboarding).length, 0),
      0,
    );

  return (
    <Layout
      title={du.name}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: 'Onboarding' },
      ]}
    >
      {/* Tab strip */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          to={`/delivery-units/${du.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Overview
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Onboarding
        </span>
      </div>

      {/* Description */}
      {du.description && (
        <p className="text-sm text-gray-500 mb-6 max-w-2xl">{du.description}</p>
      )}

      <div className="space-y-6">
        {/* ── Top stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Users size={16} />}
            label="New Hires (Onboarding)"
            value={ob.totalNewHires ?? 0}
            sub={`+${Math.floor((ob.totalNewHires ?? 0) * 0.15)} this month`}
            color="text-blue-600"
          />
          <StatCard
            icon={<Briefcase size={16} />}
            label="Open Roles"
            value={ob.totalOpenRoles ?? 0}
            sub="Active"
            color="text-indigo-600"
          />
          <StatCard
            icon={<UserMinus size={16} />}
            label="Pending Offboarding"
            value={totalScheduledOffboarding}
            color="text-amber-600"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Overall Health"
            value={ob.overallHealthStatus ?? 'Healthy'}
            color={healthMeta.text}
          />
        </div>

        {/* ── Release Trains table ────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Release Trains</h2>
            <p className="text-xs text-gray-400 mt-1">{du.releaseTrains.length} release trains</p>
          </div>

          {du.releaseTrains.length === 0 ? (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">No release trains in this delivery unit.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Squads</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Onboarding</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Offboarding</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {du.releaseTrains.map((rt) => {
                    const rtSquads = rt.squads;
                    const rtOnboarding = rtSquads.reduce((sum, sq) => sum + (sq.onboarding?.candidates.length ?? 0), 0);
                    const rtOffboarding =
                      rt.assignments.filter((a) => a.isScheduledOffboarding).length +
                      rtSquads.reduce((sum, sq) => sum + sq.assignments.filter((a) => a.isScheduledOffboarding).length, 0);
                    return (
                      <tr key={rt.id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50 hover:bg-gray-100/50">
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-medium text-gray-800">{rt.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{rtSquads.length}</td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {rtOnboarding}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                            {rtOffboarding}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            to={`/release-trains/${du.id}/${rt.id}`}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Squads grid ────────────────────────────────────────────────────── */}
        {allSquads.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">All Squads</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allSquads.map((sq) => {
                const sqOb = sq.onboarding ?? { candidates: [], openPositions: [] };
                const rt = du.releaseTrains.find((r) => r.squads.some((s) => s.id === sq.id))!;
                return (
                  <Link
                    key={sq.id}
                    to={`/squads/${du.id}/${rt.id}/${sq.id}/onboarding`}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{sq.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{rt.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold text-blue-600">{sqOb.candidates.length}</p>
                        <p className="text-xs text-gray-500">Candidates</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-lg font-bold text-indigo-600">{sqOb.openPositions.length}</p>
                        <p className="text-xs text-gray-500">Open Roles</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Admin settings ──────────────────────────────────────────────────── */}
        {canEditDU && (
          <section className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Onboarding Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Overall Health Status</label>
                <select
                  value={ob.overallHealthStatus ?? 'Healthy'}
                  onChange={(e) => save({ ...ob, overallHealthStatus: e.target.value as 'Healthy' | 'Attention' | 'Critical' })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Healthy</option>
                  <option>Attention</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Total New Hires</label>
                <input
                  type="number"
                  min={0}
                  value={ob.totalNewHires ?? 0}
                  onChange={(e) => save({ ...ob, totalNewHires: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Total Open Roles</label>
                <input
                  type="number"
                  min={0}
                  value={ob.totalOpenRoles ?? 0}
                  onChange={(e) => save({ ...ob, totalOpenRoles: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Total Pending Offboarding</label>
                <input
                  type="number"
                  value={totalScheduledOffboarding}
                  disabled
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">Calculated from roles flagged as Scheduled offboarding.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
      <div>
        <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
