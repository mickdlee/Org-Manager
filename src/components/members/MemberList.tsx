import { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
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
  onAdd: (assignment: Assignment) => void;
  onRemove: (personId: string, role: AnyRole) => void;
}

const roleColors: Record<string, 'blue' | 'green' | 'amber' | 'indigo' | 'gray'> = {
  'Delivery Unit Owner': 'blue',
  'Chief Product Owner': 'indigo',
  'Delivery Lead': 'green',
  'Release Train Engineer': 'amber',
  'Product Owner': 'blue',
  'Squad Member': 'gray',
};

export function MemberList({ assignments, people, availableRoles, isAdmin, onAdd, onRemove }: MemberListProps) {
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
        <p className="text-sm text-gray-400 py-4 text-center">No members assigned yet.</p>
      ) : (
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
                {isAdmin && <th className="px-4 py-2 w-10" />}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, i) => {
                const person = people.find((p) => p.id === a.personId);
                return (
                  <tr key={`${a.personId}-${a.role}-${i}`} className="border-b border-gray-100 last:border-0 even:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-800">{person?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{person?.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge color={roleColors[a.role] ?? 'gray'}>{a.role}</Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setRemoveTarget(a)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!personId) { setError('Please select a person.'); return; }
    const duplicate = existingAssignments.find((a) => a.personId === personId && a.role === role);
    if (duplicate) { setError('This person already holds this role here.'); return; }
    onAdd({ personId, role });
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
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}
