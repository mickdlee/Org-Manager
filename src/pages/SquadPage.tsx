import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { UserPlus, Trash2, Train, Building2, Users2, ChevronRight, Pencil, LayoutTemplate, Download } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { squadDailyCost, formatCost, WORKING_DAYS_PER_MONTH, personTotalAllocationPercent, personAllocationBreakdown } from '../utils/cost';
import { generateSquadSvg, downloadSvg } from '../utils/svgExport';
import { avatarColor, initialsFromName } from '../utils/avatar';
import { canManageSquad } from '../utils/permissions';
import type { AppData, Assignment, AnyRole, OpenPosition, SquadTemplate } from '../types';

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
  const { data, addAssignmentToSquad, removeAssignmentFromSquad, updateSquadAssignment, updateSquad, applySquadTemplate, updateSquadOnboarding } = useAppStore();
  const { session } = useAuth();

  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
  const [assignTarget, setAssignTarget] = useState<OpenPosition | null>(null);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [unallocateTarget, setUnallocateTarget] = useState<Assignment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;
  const canEditSquad = canManageSquad(data, session, du.id, rt.id, sq.id);
  const showFinancials = data.uiSettings.showFinancials;

  const getPersonName = (id: string) => data.people.find((p) => p.id === id)?.name ?? 'Unknown';
  const onboarding = sq.onboarding ?? {
    hiringPriority: 'Medium' as const,
    pendingOffboarding: 0,
    avgRampUpDays: 14,
    candidates: [],
    openPositions: [],
  };

  // Role breakdown for sidebar
  const roleBreakdown: Record<string, number> = {};
  for (const a of sq.assignments) {
    roleBreakdown[a.role] = (roleBreakdown[a.role] ?? 0) + 1;
  }

  // Unfilled roles from squad onboarding open positions
  const unfilledRoleBreakdown: Record<string, number> = {};
  const openPositions = onboarding.openPositions;
  for (const pos of openPositions) {
    unfilledRoleBreakdown[pos.title] = (unfilledRoleBreakdown[pos.title] ?? 0) + 1;
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
        {canEditSquad && (
          <>
            <Link
              to={`/squads/${du.id}/${rt.id}/${sq.id}/editor`}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Editor
            </Link>
            <Link
              to={`/squads/${du.id}/${rt.id}/${sq.id}/onboarding`}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Onboarding
            </Link>
          </>
        )}
        <div className="ml-auto pb-2">
          {canEditSquad && (
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

      {/* Export button */}
      <div className="mb-6 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            const svg = generateSquadSvg(sq, data);
            downloadSvg(svg, `${sq.name}-orgmap`);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download size={13} /> Export as SVG
        </Button>
      </div>

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
              {showFinancials && sq.assignments.length > 0 && (() => {
                const daily = squadDailyCost(sq, (id) => data.people.find((p) => p.id === id));
                return (
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700">{formatCost(daily)}<span className="text-gray-400 font-normal">/day</span></p>
                    <p className="text-xs text-gray-400">{formatCost(daily * WORKING_DAYS_PER_MONTH)}/mo</p>
                  </div>
                );
              })()}
              {canEditSquad && (
                <div className="flex items-center gap-2">
                  {data.squadTemplates.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setShowApplyTemplate(true)}>
                      <LayoutTemplate size={13} />
                      Apply Template
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setShowAddPlaceholder(true)}>
                    <UserPlus size={13} />
                    Add Role Placeholder
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Member cards */}
          {sq.assignments.length === 0 && openPositions.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-lg py-12 text-center">
              <Users2 size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No members assigned yet.</p>
              {canEditSquad && (
                <button
                  onClick={() => setShowAddPlaceholder(true)}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Add the first role placeholder
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
                      {person ? initialsFromName(person.name) : '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-base font-semibold text-gray-800 truncate">
                        {person?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-400 truncate mb-2">
                        {person?.email ?? '—'}
                      </p>
                      {showFinancials && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                          {person?.dayRate && (
                            <span>${person.dayRate}/day</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge color={roleColors[a.role] ?? 'gray'}>{a.role}</Badge>
                        {a.isScheduledOffboarding && <Badge color="red">Offboarding</Badge>}
                      </div>
                      {a.isScheduledOffboarding && a.offboardingDate && (
                        <p className="mt-1 text-xs text-gray-500">Offboarding date: {a.offboardingDate}</p>
                      )}
                      {canEditSquad && (
                        <div className="mt-2 space-y-2">
                          <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(a.isScheduledOffboarding)}
                              onChange={(e) =>
                                updateSquadAssignment(du.id, rt.id, sq.id, a.personId, a.role, {
                                  isScheduledOffboarding: e.target.checked,
                                  offboardingDate: e.target.checked ? a.offboardingDate : undefined,
                                })
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Scheduled offboarding
                          </label>
                          {a.isScheduledOffboarding && (
                            <div>
                              <label className="block text-[11px] text-gray-500 mb-1">Offboarding date</label>
                              <input
                                type="date"
                                value={a.offboardingDate ?? ''}
                                onChange={(e) =>
                                  updateSquadAssignment(du.id, rt.id, sq.id, a.personId, a.role, {
                                    offboardingDate: e.target.value || undefined,
                                  })
                                }
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
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
                          disabled={!canEditSquad}
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
                    {canEditSquad && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 shrink-0 mt-0.5">
                        <button
                          onClick={() => setUnallocateTarget(a)}
                          className="text-gray-300 hover:text-amber-600 transition-all text-xs"
                          title="Unallocate"
                        >
                          Unallocate
                        </button>
                        <button
                          onClick={() => setRemoveTarget(a)}
                          className="text-gray-300 hover:text-red-500 transition-all"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {openPositions.map((pos) => (
                <div
                  key={`open-${pos.id}`}
                  className="rounded-lg p-4 flex items-start gap-4 bg-amber-50 border border-amber-200 relative group"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-amber-700 text-base font-semibold shrink-0 bg-amber-100 ring-2 ring-amber-100">
                    ?
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-base font-semibold text-amber-800 truncate">
                      Unfilled Role
                    </p>
                    <p className="text-xs text-amber-700/80 truncate mb-2">
                      Placeholder position
                    </p>
                    <div className="flex items-center gap-2 mb-2 text-xs text-amber-800">
                      <span>Priority: {pos.priority}</span>
                      <span>Allocation: {pos.allocationPercentage ?? 100}%</span>
                    </div>
                    <Badge color="amber">{pos.title}</Badge>
                    <p className="text-[11px] text-amber-700 mt-3">
                      Fill this role from the onboarding pipeline.
                    </p>
                    {canEditSquad && (
                      <button
                        onClick={() => setAssignTarget(pos)}
                        className="mt-2 text-xs text-blue-700 hover:underline"
                      >
                        Assign person to this role
                      </button>
                    )}
                  </div>
                  {canEditSquad && (
                    <button
                      onClick={() =>
                        updateSquadOnboarding(du.id, rt.id, sq.id, {
                          ...onboarding,
                          openPositions: onboarding.openPositions.filter((p) => p.id !== pos.id),
                        })
                      }
                      className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-red-500 transition-all shrink-0 mt-0.5"
                      title="Remove unfilled role"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
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

          {/* Unfilled Roles */}
          {Object.keys(unfilledRoleBreakdown).length > 0 && (
            <div className="bg-white border border-amber-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3">
                Unfilled Roles
              </h3>
              <div className="space-y-1.5">
                {Object.entries(unfilledRoleBreakdown).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChevronRight size={11} className="text-amber-300 shrink-0" />
                      <span className="text-gray-700 truncate">{role}</span>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5 shrink-0 ml-2">
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
      {showAddPlaceholder && (
        <AddRolePlaceholderModal
          availableRoles={data.roleConfig.squad as AnyRole[]}
          onAdd={(role, count, priority, allocationPercentage) => {
            updateSquadOnboarding(du.id, rt.id, sq.id, {
              ...onboarding,
              openPositions: [
                ...onboarding.openPositions,
                ...Array.from({ length: count }, () => ({ id: crypto.randomUUID(), title: role, priority, allocationPercentage })),
              ],
            });
            setShowAddPlaceholder(false);
          }}
          onClose={() => setShowAddPlaceholder(false)}
        />
      )}

      {assignTarget && (
        <AssignRolePlaceholderModal
          role={assignTarget.title}
          allocationPercentage={assignTarget.allocationPercentage ?? 100}
          data={data}
          currentSquadName={sq.name}
          people={data.people}
          existingAssignments={sq.assignments}
          onAssign={(personId) => {
            addAssignmentToSquad(du.id, rt.id, sq.id, {
              personId,
              role: assignTarget.title,
              allocationPercentage: assignTarget.allocationPercentage ?? 100,
            });
            updateSquadOnboarding(du.id, rt.id, sq.id, {
              ...onboarding,
              openPositions: onboarding.openPositions.filter((p) => p.id !== assignTarget.id),
            });
            setAssignTarget(null);
          }}
          onClose={() => setAssignTarget(null)}
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

      {unallocateTarget && (
        <ConfirmDialog
          title="Unallocate Member"
          message={`Unallocate ${getPersonName(unallocateTarget.personId)} from ${unallocateTarget.role}? This will create an unfilled role placeholder.`}
          confirmLabel="Unallocate"
          onConfirm={() => {
            updateSquadOnboarding(du.id, rt.id, sq.id, {
              ...onboarding,
              openPositions: [
                ...onboarding.openPositions,
                {
                  id: crypto.randomUUID(),
                  title: unallocateTarget.role,
                  priority: 'Medium',
                  allocationPercentage: unallocateTarget.allocationPercentage ?? 100,
                },
              ],
            });
            removeAssignmentFromSquad(du.id, rt.id, sq.id, unallocateTarget.personId, unallocateTarget.role as AnyRole);
            setUnallocateTarget(null);
          }}
          onCancel={() => setUnallocateTarget(null)}
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

      {showApplyTemplate && (
        <ApplyTemplateModal
          templates={data.squadTemplates}
          onClose={() => setShowApplyTemplate(false)}
          onApply={(templateId) => {
            applySquadTemplate(du.id, rt.id, sq.id, templateId);
            setShowApplyTemplate(false);
          }}
        />
      )}
    </Layout>
  );
}

// ── Add Placeholder Modal ────────────────────────────────────────────────────

interface AddRolePlaceholderModalProps {
  availableRoles: AnyRole[];
  onAdd: (role: AnyRole, count: number, priority: 'Low' | 'Medium' | 'High', allocationPercentage: number) => void;
  onClose: () => void;
}

function AddRolePlaceholderModal({ availableRoles, onAdd, onClose }: AddRolePlaceholderModalProps) {
  const [role, setRole] = useState<AnyRole>(availableRoles[0] ?? '');
  const [count, setCount] = useState(1);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [allocation, setAllocation] = useState(100);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!role) { setError('Please select a role.'); return; }
    if (count < 1) { setError('Count must be at least 1.'); return; }
    if (allocation < 0 || allocation > 100) { setError('Allocation must be between 0 and 100.'); return; }
    onAdd(role, count, priority, allocation);
  };

  return (
    <Modal title="Add Role Placeholder" onClose={onClose}>
      <div className="space-y-4">
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
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Count</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => { setCount(Math.max(1, Number(e.target.value))); setError(''); }}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Allocation (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={allocation}
            onChange={(e) => { setAllocation(Math.max(0, Math.min(100, Number(e.target.value)))); setError(''); }}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={handleSubmit}>Add Placeholder</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Assign Placeholder Modal ─────────────────────────────────────────────────

interface AssignRolePlaceholderModalProps {
  role: string;
  allocationPercentage: number;
  data: AppData;
  currentSquadName: string;
  people: { id: string; name: string; email: string }[];
  existingAssignments: Assignment[];
  onAssign: (personId: string) => void;
  onClose: () => void;
}

function AssignRolePlaceholderModal({ role, allocationPercentage, data, currentSquadName, people, existingAssignments, onAssign, onClose }: AssignRolePlaceholderModalProps) {
  const [personId, setPersonId] = useState('');
  const [error, setError] = useState('');

  const availablePeople = people.filter(
    (p) => !existingAssignments.some((a) => a.personId === p.id && a.role === role),
  );

  const handleSubmit = () => {
    if (!personId) { setError('Please select a person.'); return; }
    onAssign(personId);
  };

  const selectedPerson = people.find((p) => p.id === personId);
  const currentTotal = selectedPerson ? personTotalAllocationPercent(data, selectedPerson.id) : 0;
  const nextTotal = currentTotal + allocationPercentage;
  const isOverAllocated = selectedPerson ? nextTotal > 100 : false;
  const otherTeams = selectedPerson
    ? personAllocationBreakdown(data, selectedPerson.id).filter((e) => e.sqName !== currentSquadName)
    : [];

  return (
    <Modal title={`Assign ${role}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          This placeholder will assign at <span className="font-semibold">{allocationPercentage}% allocation</span>.
        </div>
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
        {selectedPerson && (
          <div className={`rounded border px-3 py-2 text-xs ${isOverAllocated ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
            <p>
              Total allocation after assignment: <span className="font-semibold">{nextTotal}%</span>
              {!isOverAllocated && <span> (currently {currentTotal}%)</span>}
            </p>
            {isOverAllocated && (
              <p className="mt-1 font-medium">Warning: this person will be over-allocated.</p>
            )}
            {otherTeams.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">Other teams this person is in:</p>
                <div className="mt-1 space-y-1">
                  {otherTeams.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span>{entry.sqName} · {entry.rtName} · {entry.duName}</span>
                      <span className="font-semibold">{entry.allocation}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {availablePeople.length === 0 && (
          <p className="text-xs text-amber-700">Everyone already has this role in this squad.</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={handleSubmit} disabled={availablePeople.length === 0}>Assign</Button>
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

// ── Apply Template Modal ──────────────────────────────────────────────────────

interface ApplyTemplateModalProps {
  templates: SquadTemplate[];
  onClose: () => void;
  onApply: (templateId: string) => void;
}

function ApplyTemplateModal({ templates, onClose, onApply }: ApplyTemplateModalProps) {
  const [selected, setSelected] = useState(templates[0]?.id ?? '');
  const preview = templates.find((t) => t.id === selected);

  return (
    <Modal title="Apply Squad Template" onClose={onClose}>
      <div className="space-y-4 min-w-72">
        <p className="text-xs text-gray-500">
          Applying a template creates open positions in this squad's onboarding pipeline for each role defined in the template.
        </p>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Template</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        {preview && preview.roles.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Open positions to be created</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.roles.map((r, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                  {r.role} ×{r.count}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(selected)} disabled={!selected}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
