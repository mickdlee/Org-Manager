import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { UserMinus, Users2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import type { OpenPosition } from '../types';

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

export function SquadEditorPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, addAssignmentToSquad, removeAssignmentFromSquad, updateSquadAssignment, updateSquadOnboarding } = useAppStore();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [activeDropRole, setActiveDropRole] = useState<string | null>(null);

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  const onboarding = sq.onboarding ?? {
    hiringPriority: 'Medium' as const,
    pendingOffboarding: 0,
    avgRampUpDays: 14,
    candidates: [],
    openPositions: [],
  };

  const searchText = search.trim().toLowerCase();

  const filteredPeople = useMemo(
    () => data.people.filter((p) => p.name.toLowerCase().includes(searchText)),
    [data.people, searchText],
  );

  const roleSlots = useMemo(
    () => [
      ...sq.assignments.map((assignment, index) => ({
        id: `assignment-${assignment.personId}-${assignment.role}-${index}`,
        role: assignment.role,
        assignment,
        placeholder: null as OpenPosition | null,
      })),
      ...onboarding.openPositions.map((position) => ({
        id: `placeholder-${position.id}`,
        role: position.title,
        assignment: null,
        placeholder: position,
      })),
    ],
    [sq.assignments, onboarding.openPositions],
  );

  const onDropToPlaceholder = (placeholder: OpenPosition, personId: string) => {
    if (!isAdmin) return;

    const alreadyAssigned = sq.assignments.some((a) => a.personId === personId && a.role === placeholder.title);
    if (alreadyAssigned) return;

    addAssignmentToSquad(du.id, rt.id, sq.id, {
      personId,
      role: placeholder.title,
      allocationPercentage: placeholder.allocationPercentage ?? 100,
    });

    updateSquadOnboarding(du.id, rt.id, sq.id, {
      ...onboarding,
      openPositions: onboarding.openPositions.filter((p) => p.id !== placeholder.id),
    });
  };

  return (
    <Layout
      title={`${sq.name} Editor`}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: rt.name, to: `/release-trains/${du.id}/${rt.id}` },
        { label: sq.name, to: `/squads/${du.id}/${rt.id}/${sq.id}` },
        { label: 'Editor' },
      ]}
    >
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          to={`/squads/${du.id}/${rt.id}/${sq.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Members
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Editor
        </span>
        <Link
          to={`/squads/${du.id}/${rt.id}/${sq.id}/onboarding`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Onboarding
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
        <section className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Required Roles</h2>
              <p className="text-xs text-gray-400 mt-1">Slots are based on assigned roles and open placeholders.</p>
            </div>
            <Badge color="blue">{roleSlots.length} slots</Badge>
          </div>

          {roleSlots.length === 0 ? (
            <div className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-400">
              <p className="text-sm">No assigned roles or placeholders yet.</p>
              <p className="text-xs mt-1">Create placeholders in onboarding to add editable slots.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {roleSlots.map((slot) => {
                const assignment = slot.assignment;
                const placeholder = slot.placeholder;
                const person = assignment ? data.people.find((p) => p.id === assignment.personId) : null;
                const isDroppable = Boolean(placeholder);
                const isActiveDrop = isDroppable && activeDropRole === slot.id;

                return (
                  <div
                    key={slot.id}
                    onDragOver={(e) => {
                      if (!isAdmin || !isDroppable) return;
                      e.preventDefault();
                      setActiveDropRole(slot.id);
                    }}
                    onDragLeave={() => setActiveDropRole((prev) => (prev === slot.id ? null : prev))}
                    onDrop={(e) => {
                      if (!isAdmin || !placeholder) return;
                      e.preventDefault();
                      const personId = e.dataTransfer.getData('text/person-id');
                      setActiveDropRole(null);
                      if (!personId) return;
                      onDropToPlaceholder(placeholder, personId);
                    }}
                    className={`rounded-lg border p-2 transition-colors aspect-square flex flex-col ${
                      isActiveDrop
                        ? 'border-blue-400 bg-blue-50'
                        : assignment
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-800">{slot.role}</p>
                      <Badge color={assignment ? 'green' : 'gray'}>
                        {assignment ? 'Assigned' : 'Open'}
                      </Badge>
                    </div>

                    {assignment && person ? (
                      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                        <div className="bg-white border border-gray-200 rounded p-1">
                          <div className="w-3/4 mx-auto aspect-square min-h-0">
                            {person.photoUrl ? (
                              <img
                                src={person.photoUrl}
                                alt={person.name}
                                className="w-full h-full object-cover rounded"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  img.style.display = 'none';
                                  const fallback = img.nextElementSibling as HTMLElement | null;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full rounded items-center justify-center text-sm font-semibold text-white ${avatarColor(person.id)} ${person.photoUrl ? 'hidden' : 'flex'}`}
                            >
                              {initials(person.name) || '?'}
                            </div>
                          </div>

                          <div className="min-w-0 mt-1 w-full text-center">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{person.name}</p>
                          </div>

                          <div className="mt-0.5 flex justify-end">
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  removeAssignmentFromSquad(du.id, rt.id, sq.id, assignment.personId, assignment.role);
                                  updateSquadOnboarding(du.id, rt.id, sq.id, {
                                    ...onboarding,
                                    openPositions: [
                                      ...onboarding.openPositions,
                                      {
                                        id: crypto.randomUUID(),
                                        title: assignment.role,
                                        priority: 'Medium',
                                        allocationPercentage: assignment.allocationPercentage ?? 100,
                                      },
                                    ],
                                  });
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                title="Remove from role"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </div>

                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] uppercase tracking-wide text-gray-400">Alloc</span>
                              <span className="text-[10px] font-semibold text-gray-600">{assignment.allocationPercentage ?? 100}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={assignment.allocationPercentage ?? 100}
                              onChange={(e) =>
                                updateSquadAssignment(du.id, rt.id, sq.id, assignment.personId, assignment.role, {
                                  allocationPercentage: Number(e.target.value),
                                })
                              }
                              className="w-full h-1.5"
                              aria-label={`Allocation for ${person.name} in ${slot.role}`}
                              disabled={!isAdmin}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 border border-dashed border-gray-300 rounded px-2 py-3 text-center bg-white flex items-center justify-center">
                        <p className="text-xs text-gray-400">
                          {isAdmin ? 'Drop person here' : 'Open placeholder'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">People Search</h2>
            <p className="text-xs text-gray-400 mt-1">Find by name and drag a person tile to assign.</p>
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name"
          />

          <div className="mt-3 max-h-[30rem] overflow-y-auto pr-1">
            {filteredPeople.length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-400">
                <Users2 size={18} className="mx-auto mb-2" />
                <p className="text-xs">No people found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {filteredPeople.map((p) => (
                  <div
                    key={p.id}
                    draggable={isAdmin}
                    onDragStart={(e) => e.dataTransfer.setData('text/person-id', p.id)}
                    onDragEnd={() => setActiveDropRole(null)}
                    className={`rounded border border-gray-200 p-1.5 bg-gray-50 aspect-square flex flex-col items-center justify-center text-center ${
                      isAdmin ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    <div className="w-full flex-1 min-h-0">
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = 'none';
                            const fallback = img.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full rounded items-center justify-center text-sm font-semibold text-white ${avatarColor(p.id)} ${p.photoUrl ? 'hidden' : 'flex'}`}
                      >
                        {initials(p.name) || '?'}
                      </div>
                    </div>
                    <div className="min-w-0 mt-1.5 w-full">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isAdmin && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              You have read-only access. Only admins can assign people.
            </p>
          )}
        </aside>
      </div>
    </Layout>
  );
}
