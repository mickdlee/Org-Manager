import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { UserPlus, Trash2, Train, Building2, Users2, ChevronRight, DollarSign, Pencil } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { squadDailyCost, formatCost, WORKING_DAYS_PER_MONTH, personTotalAllocationPercent, personAllocationBreakdown } from '../utils/cost';
import type { Assignment, AnyRole } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-teal-600',
  'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function avatarColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const roleColors: Record<string, 'blue' | 'green' | 'amber' | 'indigo' | 'gray'> = {
  'Delivery Unit Owner': 'blue',
  'Chief Product Owner': 'indigo',
  'Delivery Lead': 'green',
  'Release Train Engineer': 'amber',
  'Product Owner': 'blue',
  'Squad Member': 'gray',
};

// ── page ─────────────────────────────────────────────────────────────────────

export function SquadPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, addAssignmentToSquad, removeAssignmentFromSquad, updateSquadAssignment, updateSquad } = useAppStore();
  const { isAdmin } = useAuth();

  const [showAdd, setShowAdd] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  const getPersonName = (id: string) => data.people.find((p) => p.id === id)?.name ?? 'Unknown';

  // Role breakdown for sidebar
  const roleBreakdown: Record<string, number> = {};
  for (const a of sq.assignments) {
    roleBreakdown[a.role] = (roleBreakdown[a.role] ?? 0) + 1;
  }

  return (
    <Layout
      title={sq.name}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: rt.name, to: `/release-trains/${du.id}/${rt.id}` },
        { label: sq.name },
      ]}
    >
      {/* Tab strip */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Members
        </span>
        <Link
          to={`/squads/${du.id}/${rt.id}/${sq.id}/onboarding`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Onboarding
        </Link>
        <div className="ml-auto pb-2">
          {isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => setShowEditTeam(true)}>
              <Pencil size={13} />
              Edit Team
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {sq.description && (
        <p className="text-sm text-gray-500 mb-6 max-w-2xl">{sq.description}</p>
      )}

      <div className="flex gap-6 items-start">
        {/* ── Members panel ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users2 size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Members
              </h2>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {sq.assignments.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {sq.assignments.length > 0 && (() => {
                const daily = squadDailyCost(sq, (id) => data.people.find((p) => p.id === id));
                return (
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700">{formatCost(daily)}<span className="text-gray-400 font-normal">/day</span></p>
                    <p className="text-xs text-gray-400">{formatCost(daily * WORKING_DAYS_PER_MONTH)}/mo</p>
                  </div>
                );
              })()}
              {isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
                  <UserPlus size={13} />
                  Add Member
                </Button>
              )}
            </div>
          </div>

          {/* Member cards */}
          {sq.assignments.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-lg py-12 text-center">
              <Users2 size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No members assigned yet.</p>
              {isAdmin && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Add the first member
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {sq.assignments.map((a, i) => {
                const person = data.people.find((p) => p.id === a.personId);
                const totalAllocation = person ? personTotalAllocationPercent(data, person.id) : 0;
                const isOverAllocated = totalAllocation > 100;
                return (
                  <div
                    key={`${a.personId}-${a.role}-${i}`}
                    className={`rounded-lg p-4 flex items-start gap-4 group hover:shadow-sm transition-all ${
                      isOverAllocated
                        ? 'bg-red-50 border border-red-200 hover:border-red-300'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Avatar */}
                    {person?.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt={person.name}
                        className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = 'none';
                          const fallback = img.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-full items-center justify-center text-white text-base font-semibold shrink-0 ${avatarColor(a.personId)} ${person?.photoUrl ? 'hidden' : 'flex'}`}
                    >
                      {person ? initials(person.name) : '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-base font-semibold text-gray-800 truncate">
                        {person?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 truncate mb-2">
                        {person?.email ?? '—'}
                      </p>
                      <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                        {person?.dayRate && (
                          <span>${person.dayRate}/day</span>
                        )}
                      </div>
                      <Badge color={roleColors[a.role] ?? 'gray'}>{a.role}</Badge>
                      {/* Allocation slider */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Allocation</span>
                          {person && (() => {
                            const breakdown = personAllocationBreakdown(data, person.id);
                            return (
                              <div className="relative group/alloc">
                                <span className={`text-xs font-semibold cursor-default underline decoration-dotted decoration-gray-400 ${isOverAllocated ? 'text-red-700' : 'text-gray-700'}`}>
                                  {a.allocationPercentage ?? 100}%
                                </span>
                                {breakdown.length > 0 && (
                                  <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover/alloc:block w-max min-w-48 bg-white border border-gray-200 rounded shadow-lg text-xs font-normal text-gray-700 py-2">
                                    {breakdown.map((entry, i) => (
                                      <div key={i} className="flex items-center justify-between gap-6 px-3 py-1 hover:bg-gray-50">
                                        <span className="text-gray-600">
                                          <span className="font-medium text-gray-800">{entry.sqName}</span>
                                          <span className="text-gray-400 mx-1">·</span>
                                          {entry.rtName}
                                          <span className="text-gray-400 mx-1">·</span>
                                          {entry.duName}
                                        </span>
                                        <span className={`font-semibold ${isOverAllocated ? 'text-red-600' : 'text-gray-800'}`}>{entry.allocation}%</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          disabled={!isAdmin}
                          value={a.allocationPercentage ?? 100}
                          onChange={(e) =>
                            updateSquadAssignment(du.id, rt.id, sq.id, a.personId, a.role, {
                              allocationPercentage: Number(e.target.value),
                            })
                          }
                          className="w-full h-1.5 accent-blue-600 cursor-pointer disabled:cursor-default"
                        />
                        {isOverAllocated && (
                          <p className="text-[11px] text-red-600 mt-1">
                            Over-allocated across teams ({totalAllocation}%)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Remove */}
                    {isAdmin && (
                      <button
                        onClick={() => setRemoveTarget(a)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0 mt-0.5"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Context sidebar ───────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 space-y-4">
          {/* Unit Context */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Unit Context
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Building2 size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Delivery Unit</p>
                  <Link
                    to={`/delivery-units/${du.id}`}
                    className="font-medium text-blue-600 hover:underline leading-tight"
                  >
                    {du.name}
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Train size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Release Train</p>
                  <Link
                    to={`/release-trains/${du.id}/${rt.id}`}
                    className="font-medium text-blue-600 hover:underline leading-tight"
                  >
                    {rt.name}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Role Breakdown */}
          {sq.assignments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Role Breakdown
              </h3>
              <div className="space-y-1.5">
                {Object.entries(roleBreakdown).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChevronRight size={11} className="text-gray-300 shrink-0" />
                      <span className="text-gray-600 truncate">{role}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0 ml-2">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Squads in this RT */}
          {rt.squads.filter((s) => s.id !== sq.id).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Other Squads
              </h3>
              <div className="space-y-1">
                {rt.squads
                  .filter((s) => s.id !== sq.id)
                  .map((s) => (
                    <Link
                      key={s.id}
                      to={`/squads/${du.id}/${rt.id}/${s.id}`}
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 py-1 transition-colors"
                    >
                      <Users2 size={12} className="text-gray-300 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showAdd && (
        <AddMemberModal
          people={data.people}
          availableRoles={data.roleConfig.squad as AnyRole[]}
          existingAssignments={sq.assignments}
          onAdd={(a) => { addAssignmentToSquad(du.id, rt.id, sq.id, a); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove Member"
          message={`Remove ${getPersonName(removeTarget.personId)} (${removeTarget.role}) from ${sq.name}?`}
          confirmLabel="Remove"
          onConfirm={() => {
            removeAssignmentFromSquad(du.id, rt.id, sq.id, removeTarget.personId, removeTarget.role as AnyRole);
            setRemoveTarget(null);
          }}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {showEditTeam && (
        <EditTeamModal
          initialName={sq.name}
          initialDescription={sq.description}
          onClose={() => setShowEditTeam(false)}
          onSave={(name, description) => {
            updateSquad(du.id, rt.id, sq.id, { name, description });
            setShowEditTeam(false);
          }}
        />
      )}
    </Layout>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────

interface AddMemberModalProps {
  people: { id: string; name: string; email: string }[];
  availableRoles: AnyRole[];
  existingAssignments: Assignment[];
  onAdd: (assignment: Assignment) => void;
  onClose: () => void;
}

function AddMemberModal({ people, availableRoles, existingAssignments, onAdd, onClose }: AddMemberModalProps) {
  const [personId, setPersonId] = useState('');
  const [role, setRole] = useState<AnyRole>(availableRoles[0] ?? '');
  const [error, setError] = useState('');

  const availablePeople = people.filter(
    (p) => !existingAssignments.some((a) => a.personId === p.id && a.role === role),
  );

  const handleSubmit = () => {
    if (!personId) { setError('Please select a person.'); return; }
    if (!role) { setError('Please select a role.'); return; }
    onAdd({ personId, role, allocationPercentage: 100 });
  };

  return (
    <Modal title="Add Member" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Person</label>
          <select
            value={personId}
            onChange={(e) => { setPersonId(e.target.value); setError(''); }}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">— Select person —</option>
            {availablePeople.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as AnyRole); setError(''); }}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={handleSubmit}>Add Member</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

interface EditTeamModalProps {
  initialName: string;
  initialDescription: string;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

function EditTeamModal({ initialName, initialDescription, onClose, onSave }: EditTeamModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError('Team name is required.');
      return;
    }
    onSave(name.trim(), description.trim());
  };

  return (
    <Modal
      title="Edit Team"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Team Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          error={error}
          placeholder="e.g. Platform Core"
        />
        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe this team..."
        />
      </div>
    </Modal>
  );
}
