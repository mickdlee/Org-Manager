import { useRef, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { Navigate } from 'react-router-dom';
import { Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';
import type { AppData, RoleConfig, SquadTemplateRole } from '../types';
import { ConfirmDialog, Modal } from '../components/ui/Modal';

export function SettingsPage() {
  const { isAdmin, createUser } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <Layout title="Settings">
      <div className="max-w-xl space-y-6">
        <DataBackupSection />
        <SampleDataSection />
        <FinancialVisibilitySection />
        <SquadTemplatesSection />
        <RoleConfigSection />
        <CreateUserSection createUser={createUser} />
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
      const parsed = JSON.parse(raw) as Partial<AppData>;

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON file.');
      }
      if (!Array.isArray(parsed.deliveryUnits) || !Array.isArray(parsed.people)) {
        throw new Error('File is missing required data arrays (deliveryUnits, people).');
      }

      importAllData(parsed as AppData);
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
