import { useState } from 'react';
import { UserPlus, Trash2, Users2 } from 'lucide-react';
import type { Assignment, AnyRole, Person } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/Modal';

interface MemberListProps {
  assignments: Assignment[];
  people: Person[];
  availableRoles: AnyRole[];
  isAdmin: boolean;
  showFinancials?: boolean;
  onAdd: (assignment: Assignment) => void;
  onRemove: (personId: string, role: AnyRole) => void;
  onUpdate?: (personId: string, role: AnyRole, patch: Partial<Assignment>) => void;
}

const roleColors: Record<string, 'blue' | 'green' | 'amber' | 'indigo' | 'gray'> = {
  'Delivery Unit Owner': 'blue',
  'Chief Product Owner': 'indigo',
  'Delivery Lead': 'green',
  'Release Train Engineer': 'amber',
  'Product Owner': 'blue',
  'Squad Member': 'gray',
};

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-teal-600',
  'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600',
];

function avatarColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';
}

export function MemberList({ assignments, people, availableRoles, isAdmin, showFinancials = true, onAdd, onRemove, onUpdate }: MemberListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Assignment | null>(null);

  const getPersonName = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Members</h3>
        {isAdmin && (
          <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
            <UserPlus size={13} />
            Assign
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg py-10 text-center">
          <Users2 size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No members assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {assignments.map((a, i) => {
            const person = people.find((p) => p.id === a.personId);
            return (
              <div
                key={`${a.personId}-${a.role}-${i}`}
                className="rounded-lg p-4 flex items-start gap-4 group hover:shadow-sm transition-all bg-white border border-gray-200 hover:border-gray-300"
              >
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

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-base font-semibold text-gray-800 truncate">{person?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate mb-2">{person?.email ?? '—'}</p>
                  {showFinancials && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-600">
                      {person?.dayRate ? <span>${person.dayRate}/day</span> : <span>—</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={roleColors[a.role] ?? 'gray'}>{a.role}</Badge>
                    {a.isScheduledOffboarding && <Badge color="red">Offboarding</Badge>}
                  </div>
                  {isAdmin && onUpdate && (
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(a.isScheduledOffboarding)}
                        onChange={(e) =>
                          onUpdate(a.personId, a.role, { isScheduledOffboarding: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Scheduled offboarding
                    </label>
                  )}
                </div>

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

      {showAdd && (
        <AddMemberModal
          people={people}
          availableRoles={availableRoles}
          existingAssignments={assignments}
          onAdd={(a) => { onAdd(a); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title="Remove Assignment"
          message={`Remove ${getPersonName(removeTarget.personId)} (${removeTarget.role}) from this team?`}
          confirmLabel="Remove"
          onConfirm={() => { onRemove(removeTarget.personId, removeTarget.role as AnyRole); setRemoveTarget(null); }}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}

interface AddMemberModalProps {
  people: Person[];
  availableRoles: AnyRole[];
  existingAssignments: Assignment[];
  onAdd: (assignment: Assignment) => void;
  onClose: () => void;
}

function AddMemberModal({ people, availableRoles, existingAssignments, onAdd, onClose }: AddMemberModalProps) {
  const [personId, setPersonId] = useState('');
  const [role, setRole] = useState<AnyRole>(availableRoles[0]);
  const [isScheduledOffboarding, setIsScheduledOffboarding] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!personId) { setError('Please select a person.'); return; }
    const duplicate = existingAssignments.find((a) => a.personId === personId && a.role === role);
    if (duplicate) { setError('This person already holds this role here.'); return; }
    onAdd({ personId, role, isScheduledOffboarding });
  };

  return (
    <Modal
      title="Assign Member"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Assign</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Person</label>
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            <option value="">— Select a person —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AnyRole)}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isScheduledOffboarding}
            onChange={(e) => setIsScheduledOffboarding(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Scheduled for offboarding
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
