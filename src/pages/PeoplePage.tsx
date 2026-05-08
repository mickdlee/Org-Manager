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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Photo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Day Rate ($)</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Allocation (%)</th>
                {isAdmin && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 even:bg-gray-50/40">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center">
                        {p.name
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase())
                          .join('') || '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.dayRate ? `$${p.dayRate}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.allocationPercentage ? `${p.allocationPercentage}%` : '—'}
                  </td>
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
          onSubmit={(name, email, photoUrl, dayRate, allocationPercentage) => { addPerson({ name, email, photoUrl, dayRate, allocationPercentage }); setShowCreate(false); }}
        />
      )}
      {editTarget && editPerson && (
        <PersonFormModal
          title="Edit Person"
          initialName={editPerson.name}
          initialEmail={editPerson.email}
          initialPhotoUrl={editPerson.photoUrl}
          initialDayRate={editPerson.dayRate}
          initialAllocationPercentage={editPerson.allocationPercentage}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, email, photoUrl, dayRate, allocationPercentage) => { updatePerson(editTarget, { name, email, photoUrl, dayRate, allocationPercentage }); setEditTarget(null); }}
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
  initialPhotoUrl?: string;
  initialDayRate?: number;
  initialAllocationPercentage?: number;
  onClose: () => void;
  onSubmit: (name: string, email: string, photoUrl?: string, dayRate?: number, allocationPercentage?: number) => void;
}

function PersonFormModal({ title, initialName = '', initialEmail = '', initialPhotoUrl = '', initialDayRate, initialAllocationPercentage, onClose, onSubmit }: PersonFormModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [dayRate, setDayRate] = useState(initialDayRate?.toString() ?? '');
  const [allocationPercentage, setAllocationPercentage] = useState(initialAllocationPercentage?.toString() ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string; photoUrl?: string; dayRate?: string; allocationPercentage?: string }>({});

  const handleSubmit = () => {
    const errs: { name?: string; email?: string; photoUrl?: string; dayRate?: string; allocationPercentage?: string } = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (photoUrl.trim() && !/^https?:\/\//i.test(photoUrl.trim())) errs.photoUrl = 'Photo URL must start with http:// or https://';
    if (dayRate && (isNaN(Number(dayRate)) || Number(dayRate) < 0)) errs.dayRate = 'Enter a valid day rate.';
    if (allocationPercentage && (isNaN(Number(allocationPercentage)) || Number(allocationPercentage) < 0 || Number(allocationPercentage) > 100)) errs.allocationPercentage = 'Enter a value between 0 and 100.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(
      name.trim(),
      email.trim().toLowerCase(),
      photoUrl.trim() || undefined,
      dayRate ? Number(dayRate) : undefined,
      allocationPercentage ? Number(allocationPercentage) : undefined,
    );
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
        <Input label="Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} error={errors.photoUrl} placeholder="https://example.com/photo.jpg" />
        <Input label="Day Rate ($)" type="number" value={dayRate} onChange={(e) => setDayRate(e.target.value)} error={errors.dayRate} placeholder="e.g. 650" min="0" />
        <Input label="Allocation (% per person)" type="number" value={allocationPercentage} onChange={(e) => setAllocationPercentage(e.target.value)} error={errors.allocationPercentage} placeholder="e.g. 100" min="0" max="100" />
      </div>
    </Modal>
  );
}
