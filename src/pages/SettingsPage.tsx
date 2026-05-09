import { useRef, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';
import type { AppData, RoleConfig, SquadTemplateRole, UserRole } from '../types';
import { ConfirmDialog, Modal } from '../components/ui/Modal';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAssignmentLike(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.personId !== 'string') return false;
  if (typeof value.role !== 'string') return false;
  if (value.allocationPercentage !== undefined && typeof value.allocationPercentage !== 'number') return false;
  if (value.isScheduledOffboarding !== undefined && typeof value.isScheduledOffboarding !== 'boolean') return false;
  if (value.offboardingDate !== undefined && typeof value.offboardingDate !== 'string') return false;
  return true;
}

function isValidBackupData(value: unknown): value is AppData {
  if (!isRecord(value)) return false;

  if (!Array.isArray(value.people)) return false;
  for (const person of value.people) {
    if (!isRecord(person)) return false;
    if (typeof person.id !== 'string') return false;
    if (typeof person.name !== 'string') return false;
    if (typeof person.email !== 'string') return false;
  }

  if (!isRecord(value.roleConfig)) return false;
  if (!isStringArray(value.roleConfig.deliveryUnit)) return false;
  if (!isStringArray(value.roleConfig.releaseTrain)) return false;
  if (!isStringArray(value.roleConfig.squad)) return false;

  if (!Array.isArray(value.squadTemplates)) return false;
  for (const template of value.squadTemplates) {
    if (!isRecord(template)) return false;
    if (typeof template.id !== 'string') return false;
    if (typeof template.name !== 'string') return false;
    if (!Array.isArray(template.roles)) return false;
    for (const role of template.roles) {
      if (!isRecord(role)) return false;
      if (typeof role.role !== 'string') return false;
      if (typeof role.count !== 'number') return false;
    }
  }

  if (!isRecord(value.uiSettings)) return false;
  if (typeof value.uiSettings.showFinancials !== 'boolean') return false;

  if (!Array.isArray(value.deliveryUnits)) return false;
  for (const du of value.deliveryUnits) {
    if (!isRecord(du)) return false;
    if (typeof du.id !== 'string') return false;
    if (typeof du.name !== 'string') return false;
    if (typeof du.type !== 'string') return false;
    if (typeof du.description !== 'string') return false;
    if (!Array.isArray(du.assignments) || !du.assignments.every(isAssignmentLike)) return false;
    if (!Array.isArray(du.releaseTrains)) return false;

    if (du.okrs !== undefined && !Array.isArray(du.okrs)) return false;
    if (du.openPositions !== undefined && !Array.isArray(du.openPositions)) return false;

    for (const rt of du.releaseTrains) {
      if (!isRecord(rt)) return false;
      if (typeof rt.id !== 'string') return false;
      if (typeof rt.name !== 'string') return false;
      if (typeof rt.description !== 'string') return false;
      if (!Array.isArray(rt.assignments) || !rt.assignments.every(isAssignmentLike)) return false;
      if (!Array.isArray(rt.squads)) return false;
      if (rt.openPositions !== undefined && !Array.isArray(rt.openPositions)) return false;

      for (const sq of rt.squads) {
        if (!isRecord(sq)) return false;
        if (typeof sq.id !== 'string') return false;
        if (typeof sq.name !== 'string') return false;
        if (typeof sq.description !== 'string') return false;
        if (!Array.isArray(sq.assignments) || !sq.assignments.every(isAssignmentLike)) return false;
      }
    }
  }

  return true;
}

export function SettingsPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'backup' | 'sample' | 'financials' | 'templates' | 'roles' | 'users'>('backup');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const tabs: Array<{ key: 'backup' | 'sample' | 'financials' | 'templates' | 'roles' | 'users'; label: string }> = [
    { key: 'backup', label: 'Data Backup' },
    { key: 'sample', label: 'Sample Data' },
    { key: 'financials', label: 'Financial Visibility' },
    { key: 'templates', label: 'Squad Templates' },
    { key: 'roles', label: 'Role Types' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <Layout title="Settings">
      <div className="max-w-4xl space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeTab === 'backup' && <DataBackupSection />}
          {activeTab === 'sample' && <SampleDataSection />}
          {activeTab === 'financials' && <FinancialVisibilitySection />}
          {activeTab === 'templates' && <SquadTemplatesSection />}
          {activeTab === 'roles' && <RoleConfigSection />}
          {activeTab === 'users' && <UserAdministrationSection />}
        </div>
      </div>
    </Layout>
  );
}

function DataBackupSection() {
  const { exportAllData, importAllData } = useAppStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    setError('');
    setSuccess('');
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `org-manager-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSuccess('Exported current data to JSON file.');
  };

  const handleImportFile = async (file: File) => {
    setError('');
    setSuccess('');
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidBackupData(parsed)) {
        throw new Error('Invalid backup file format. Please export a fresh backup and try again.');
      }

      importAllData(parsed);
      setSuccess('Data file loaded successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data file.';
      setError(msg);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-1">Data Backup</h2>
      <p className="text-xs text-gray-500 mb-4">
        Export all current application data to JSON, or load a JSON backup file.
      </p>

      <div className="flex flex-col gap-2">
        <Button variant="ghost" onClick={handleExport}>Export All Data (JSON)</Button>
        <Button variant="ghost" onClick={() => inputRef.current?.click()}>Load Data File (JSON)</Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
          }}
          className="hidden"
        />
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mt-3">{success}</p>}
    </Card>
  );
}

function FinancialVisibilitySection() {
  const { data, setShowFinancials } = useAppStore();

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-1">Financial Visibility</h2>
      <p className="text-xs text-gray-500 mb-4">
        Control whether day rates and cost summaries are visible across the app.
      </p>
      <label className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
        <span className="text-sm text-gray-700">Show financials</span>
        <input
          type="checkbox"
          checked={data.uiSettings.showFinancials}
          onChange={(e) => setShowFinancials(e.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
      </label>
    </Card>
  );
}

// ── Sample Data ───────────────────────────────────────────────────────────────

function SampleDataSection() {
  const { resetToSampleData, resetToLargeSampleData } = useAppStore();
  const [confirmDefault, setConfirmDefault] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(false);

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-1">Sample Data</h2>
      <p className="text-xs text-gray-500 mb-4">
        Load two pre-built Delivery Units with Release Trains, Squads, and 18 people to explore the application. This will replace all current data.
      </p>
      <div className="flex flex-col gap-2">
        <Button variant="ghost" onClick={() => setConfirmDefault(true)}>
          <RefreshCw size={13} />
          Reset to Sample Data
        </Button>
        <Button variant="ghost" onClick={() => setConfirmLarge(true)}>
          <RefreshCw size={13} />
          Load Large Sample Data (20 DUs)
        </Button>
      </div>

      {confirmDefault && (
        <ConfirmDialog
          title="Reset to Sample Data"
          message="This will replace all Delivery Units, Release Trains, Squads, and People with sample data. This cannot be undone."
          confirmLabel="Reset"
          onConfirm={() => { resetToSampleData(); setConfirmDefault(false); }}
          onCancel={() => setConfirmDefault(false)}
        />
      )}

      {confirmLarge && (
        <ConfirmDialog
          title="Load Large Sample Data"
          message="This will replace all current data with a large generated data set: 20 Delivery Units, each with 1-5 Release Trains and each Release Train with 5-8 Squads."
          confirmLabel="Load"
          onConfirm={() => { resetToLargeSampleData(); setConfirmLarge(false); }}
          onCancel={() => setConfirmLarge(false)}
        />
      )}
    </Card>
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

// ── User Administration ─────────────────────────────────────────────────────

function UserAdministrationSection() {
  const { users, session, createUser, updateUser, deleteUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [salaryId, setSalaryId] = useState('');

  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editSalaryId, setEditSalaryId] = useState('');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sortedUsers = [...users].sort((a, b) => a.username.localeCompare(b.username));
  const editTarget = sortedUsers.find((u) => u.id === editTargetId) ?? null;
  const deleteTarget = sortedUsers.find((u) => u.id === deleteTargetId) ?? null;

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!username.trim()) { setError('Username is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (role === 'orgManager' && !salaryId.trim()) { setError('Salary ID is required for Org Manager users.'); return; }
    try {
      await createUser(username.trim(), password, role, salaryId.trim() || undefined);
      setUsername(''); setPassword(''); setSalaryId('');
      setSuccess(`User "${username.trim()}" created.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create user.');
    }
  };

  const openEdit = (id: string) => {
    const target = sortedUsers.find((u) => u.id === id);
    if (!target) return;
    setEditTargetId(id);
    setEditUsername(target.username);
    setEditPassword('');
    setEditRole(target.role);
    setEditSalaryId(target.salaryId ?? '');
    setError('');
    setSuccess('');
  };

  const saveEdit = async () => {
    if (!editTargetId) return;
    setError('');
    setSuccess('');
    try {
      await updateUser(editTargetId, {
        username: editUsername,
        role: editRole,
        password: editPassword || undefined,
        salaryId: editSalaryId.trim() || undefined,
      });
      setEditTargetId(null);
      setSuccess('User updated successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user.');
    }
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    setError('');
    setSuccess('');
    try {
      deleteUser(deleteTargetId);
      const deletedWasCurrent = session?.userId === deleteTargetId;
      setDeleteTargetId(null);
      setSuccess(deletedWasCurrent ? 'Your account was deleted and you have been signed out.' : 'User deleted successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user.');
    }
  };

  return (
    <Card>
      <h2 className="font-semibold text-gray-800 mb-1">User Administration</h2>
      <p className="text-xs text-gray-500 mb-4">Create, edit, and remove user accounts.</p>

      <div className="space-y-4 mb-5">
        <h3 className="text-sm font-semibold text-gray-700">Create New User</h3>
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. jsmith" />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            <option value="viewer">Viewer (read-only)</option>
            <option value="orgManager">Org Manager (scoped edit)</option>
            <option value="admin">Admin (full access)</option>
          </select>
        </div>
        <Input
          label="Login Salary ID"
          value={salaryId}
          onChange={(e) => setSalaryId(e.target.value)}
          placeholder="Required for Org Manager"
        />
        <Button onClick={handleSubmit}>Create User</Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Existing Users</h3>
        {sortedUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users found.</p>
        ) : (
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Username</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/40">
                    <td className="px-3 py-2 text-gray-800">{u.username}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {u.role === 'admin' ? 'Admin' : u.role === 'orgManager' ? 'Org Manager' : 'Viewer'}
                      {u.salaryId ? <span className="text-xs text-gray-500 ml-2">({u.salaryId})</span> : null}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{session?.userId === u.id ? 'Current user' : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u.id)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTargetId(u.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTarget && (
        <Modal
          title={`Edit User: ${editTarget.username}`}
          onClose={() => setEditTargetId(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditTargetId(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Username"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="e.g. jsmith"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              >
                <option value="viewer">Viewer (read-only)</option>
                <option value="orgManager">Org Manager (scoped edit)</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
            <Input
              label="Login Salary ID"
              value={editSalaryId}
              onChange={(e) => setEditSalaryId(e.target.value)}
              placeholder="Required for Org Manager"
            />
            <Input
              label="Reset Password (Optional)"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete User"
          message={`Delete user "${deleteTarget.username}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
    </Card>
  );
}

// ── Squad Templates ───────────────────────────────────────────────────────────

function SquadTemplatesSection() {
  const { data, addSquadTemplate, updateSquadTemplate, deleteSquadTemplate } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const editTemplate = data.squadTemplates.find((t) => t.id === editTarget);

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-gray-800">Squad Templates</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> New Template
        </Button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Define reusable role compositions for squads. Applying a template creates open positions in the squad's onboarding pipeline.
      </p>

      {data.squadTemplates.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded">
          No templates yet. Create one to get started.
        </p>
      ) : (
        <div className="border border-gray-200 rounded overflow-hidden">
          {data.squadTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="flex items-start justify-between px-3 py-3 border-b border-gray-100 last:border-0 even:bg-gray-50/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 mb-1">{tmpl.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tmpl.roles.map((r, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                      {r.role} ×{r.count}
                    </span>
                  ))}
                  {tmpl.roles.length === 0 && <span className="text-xs text-gray-400">No roles defined</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3 mt-0.5">
                <button
                  onClick={() => setEditTarget(tmpl.id)}
                  className="text-gray-300 hover:text-gray-600 transition-colors"
                  title="Edit template"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => deleteSquadTemplate(tmpl.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <TemplateFormModal
          title="New Squad Template"
          initial={{ name: '', roles: [] }}
          squadRoles={data.roleConfig.squad}
          onClose={() => setShowCreate(false)}
          onSubmit={(name, roles) => { addSquadTemplate({ name, roles }); setShowCreate(false); }}
        />
      )}
      {editTemplate && (
        <TemplateFormModal
          title="Edit Squad Template"
          initial={{ name: editTemplate.name, roles: editTemplate.roles }}
          squadRoles={data.roleConfig.squad}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, roles) => { updateSquadTemplate(editTemplate.id, { name, roles }); setEditTarget(null); }}
        />
      )}
    </Card>
  );
}

interface TemplateFormModalProps {
  title: string;
  initial: { name: string; roles: SquadTemplateRole[] };
  squadRoles: string[];
  onClose: () => void;
  onSubmit: (name: string, roles: SquadTemplateRole[]) => void;
}

function TemplateFormModal({ title, initial, squadRoles, onClose, onSubmit }: TemplateFormModalProps) {
  const [name, setName] = useState(initial.name);
  const [roles, setRoles] = useState<SquadTemplateRole[]>(initial.roles.map((r) => ({ ...r })));
  const [selectedRole, setSelectedRole] = useState(squadRoles[0] ?? '');
  const [count, setCount] = useState(1);
  const [nameError, setNameError] = useState('');

  const addRole = () => {
    if (!selectedRole) return;
    const existing = roles.findIndex((r) => r.role === selectedRole);
    if (existing >= 0) {
      setRoles((prev) => prev.map((r, i) => i === existing ? { ...r, count: r.count + count } : r));
    } else {
      setRoles((prev) => [...prev, { role: selectedRole, count }]);
    }
  };

  const removeRole = (role: string) => setRoles((prev) => prev.filter((r) => r.role !== role));

  const updateCount = (role: string, val: number) => {
    if (val < 1) return;
    setRoles((prev) => prev.map((r) => r.role === role ? { ...r, count: val } : r));
  };

  const handleSubmit = () => {
    if (!name.trim()) { setNameError('Template name is required.'); return; }
    onSubmit(name.trim(), roles);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4 min-w-80">
        <Input
          label="Template Name"
          placeholder="e.g. Feature Squad"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(''); }}
          error={nameError}
        />

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Roles</label>
          {roles.length > 0 ? (
            <div className="border border-gray-200 rounded overflow-hidden mb-3">
              {roles.map((r) => (
                <div key={r.role} className="flex items-center justify-between px-3 py-2 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-700 flex-1">{r.role}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={r.count}
                      onChange={(e) => updateCount(r.role, Number(e.target.value))}
                      className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-secondary"
                    />
                    <button onClick={() => removeRole(r.role)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-3">No roles added yet.</p>
          )}

          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
              {squadRoles.length === 0 && <option value="">No squad roles defined</option>}
              {squadRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
              className="w-14 text-center border border-gray-200 rounded px-1 py-1.5 text-sm focus:outline-none focus:border-secondary"
            />
            <Button size="sm" variant="secondary" onClick={addRole} disabled={!selectedRole}>
              <Plus size={13} /> Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Template</Button>
        </div>
      </div>
    </Modal>
  );
}
