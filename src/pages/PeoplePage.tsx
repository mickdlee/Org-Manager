import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';


export function PeoplePage() {
  const { data, addPerson, updatePerson, deletePerson } = useAppStore();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = data.people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()),
  );

  const editPerson = data.people.find((p) => p.id === editTarget);
  const deletePerson_ = data.people.find((p) => p.id === deleteTarget);

  return (
    <Layout title="People">
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Person
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{data.people.length === 0 ? 'No people yet.' : 'No results match your search.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Email</th>
                {isAdmin && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/40">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditTarget(p.id)} className="text-gray-300 hover:text-gray-600 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && (
        <PersonFormModal
          title="Add Person"
          onClose={() => setShowCreate(false)}
          onSubmit={(name, email) => { addPerson({ name, email }); setShowCreate(false); }}
        />
      )}
      {editTarget && editPerson && (
        <PersonFormModal
          title="Edit Person"
          initialName={editPerson.name}
          initialEmail={editPerson.email}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, email) => { updatePerson(editTarget, { name, email }); setEditTarget(null); }}
        />
      )}
      {deleteTarget && deletePerson_ && (
        <ConfirmDialog
          title="Delete Person"
          message={`Delete "${deletePerson_.name}"? They will be removed from all assignments.`}
          onConfirm={() => { deletePerson(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}

interface PersonFormModalProps {
  title: string;
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
}

function PersonFormModal({ title, initialName = '', initialEmail = '', onClose, onSubmit }: PersonFormModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const handleSubmit = () => {
    const errs: { name?: string; email?: string } = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(name.trim(), email.trim().toLowerCase());
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit}>Save</Button></>}
    >
      <div className="space-y-4">
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Jane Smith" />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="e.g. jane@example.com" />
      </div>
    </Modal>
  );
}
