import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import type { RoleConfig } from '../types';

export function SettingsPage() {
  const { isAdmin, createUser } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <Layout title="Settings">
      <div className="max-w-xl space-y-6">
        <RoleConfigSection />
        <CreateUserSection createUser={createUser} />
      </div>
    </Layout>
  );
}

// ── Role Management ──────────────────────────────────────────────────────────

const LAYER_LABELS: { key: keyof RoleConfig; label: string; description: string }[] = [
  { key: 'deliveryUnit', label: 'Delivery Unit Roles', description: 'Roles assigned at the Delivery Unit level' },
  { key: 'releaseTrain', label: 'Release Train Roles', description: 'Roles assigned at the Release Train level' },
  { key: 'squad', label: 'Squad Roles', description: 'Roles assigned at the Squad level' },
];

function RoleConfigSection() {
  const { data, addRole, removeRole } = useAppStore();

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-1">Manage Role Types</h2>
      <p className="text-xs text-gray-500 mb-5">
        Define the roles that can be assigned at each organisational layer. Removing a role does not affect existing assignments.
      </p>
      <div className="space-y-6">
        {LAYER_LABELS.map(({ key, label, description }) => (
          <RoleLayerEditor
            key={key}
            layer={key}
            label={label}
            description={description}
            roles={data.roleConfig[key]}
            onAdd={(role) => addRole(key, role)}
            onRemove={(role) => removeRole(key, role)}
          />
        ))}
      </div>
    </Card>
  );
}

interface RoleLayerEditorProps {
  layer: keyof RoleConfig;
  label: string;
  description: string;
  roles: string[];
  onAdd: (role: string) => void;
  onRemove: (role: string) => void;
}

function RoleLayerEditor({ label, description, roles, onAdd, onRemove }: RoleLayerEditorProps) {
  const [newRole, setNewRole] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = newRole.trim();
    if (!trimmed) { setError('Role name is required.'); return; }
    if (roles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setError('This role already exists.');
      return;
    }
    onAdd(trimmed);
    setNewRole('');
    setError('');
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-0.5">{label}</h3>
      <p className="text-xs text-gray-400 mb-3">{description}</p>

      {/* Existing roles */}
      <div className="border border-gray-200 rounded overflow-hidden mb-3">
        {roles.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-3 text-center">No roles defined.</p>
        ) : (
          <ul>
            {roles.map((role) => (
              <li
                key={role}
                className="flex items-center justify-between px-3 py-2 text-sm border-b border-gray-100 last:border-0 even:bg-gray-50/40"
              >
                <span className="text-gray-700">{role}</span>
                <button
                  onClick={() => onRemove(role)}
                  className="text-gray-300 hover:text-red-500 transition-colors ml-2"
                  title={`Remove "${role}"`}
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add new role */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            placeholder="New role name…"
            value={newRole}
            onChange={(e) => { setNewRole(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            error={error}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={handleAdd} className="mt-0.5 shrink-0">
          <Plus size={13} /> Add
        </Button>
      </div>
    </div>
  );
}

// ── Create User ──────────────────────────────────────────────────────────────

function CreateUserSection({ createUser }: { createUser: (username: string, password: string, role: 'admin' | 'viewer') => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!username.trim()) { setError('Username is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    await createUser(username.trim(), password, role);
    setUsername(''); setPassword('');
    setSuccess(`User "${username.trim()}" created.`);
  };

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-4">Create New User</h2>
      <div className="space-y-4">
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jsmith" />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
        <Button onClick={handleSubmit}>Create User</Button>
      </div>
    </Card>
  );
}

