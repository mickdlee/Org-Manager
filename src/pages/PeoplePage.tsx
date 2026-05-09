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
import { personTotalAllocationPercent, personAllocationBreakdown } from '../utils/cost';


export function PeoplePage() {
  const { data, addPerson, updatePerson, deletePerson } = useAppStore();
  const { isAdmin } = useAuth();
  const showFinancials = data.uiSettings.showFinancials;

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = data.people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.salaryId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.typicalRole ?? '').toLowerCase().includes(search.toLowerCase()),
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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Salary ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Typical Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Photo</th>
                {showFinancials && <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Day Rate ($)</th>}
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Total Team Allocation</th>
                {isAdmin && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const totalAllocation = personTotalAllocationPercent(data, p.id);
                const isOverAllocated = totalAllocation > 100;
                return (
                <tr key={p.id} className={`border-b last:border-0 ${isOverAllocated ? 'bg-red-50 border-red-100' : 'border-gray-100 even:bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.email}</td>
                  <td className="px-4 py-3 text-gray-600">{p.salaryId ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.typicalRole ?? '—'}</td>
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
                  {showFinancials && (
                    <td className="px-4 py-3 text-gray-600">
                      {p.dayRate ? `$${p.dayRate}` : '—'}
                    </td>
                  )}
                  <td className={`px-4 py-3 font-semibold ${isOverAllocated ? 'text-red-700' : 'text-gray-700'}`}>
                    <div className="relative inline-block group">
                      <span className="cursor-default underline decoration-dotted decoration-gray-400">{totalAllocation}%</span>
                      {(() => {
                        const breakdown = personAllocationBreakdown(data, p.id);
                        if (breakdown.length === 0) return null;
                        return (
                          <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block w-max min-w-48 bg-white border border-gray-200 rounded shadow-lg text-xs font-normal text-gray-700 py-2">
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
                        );
                      })()}
                    </div>
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
              )})}
            </tbody>
          </table>
        )}
      </Card>

      {showCreate && (
        <PersonFormModal
          title="Add Person"
          showFinancials={showFinancials}
          squadRoles={data.roleConfig.squad}
          onClose={() => setShowCreate(false)}
          onSubmit={(name, email, salaryId, typicalRole, photoUrl, dayRate) => {
            addPerson({ name, email, salaryId, typicalRole, photoUrl, dayRate });
            setShowCreate(false);
          }}
        />
      )}
      {editTarget && editPerson && (
        <PersonFormModal
          title="Edit Person"
          initialName={editPerson.name}
          initialEmail={editPerson.email}
          initialSalaryId={editPerson.salaryId}
          initialTypicalRole={editPerson.typicalRole}
          initialPhotoUrl={editPerson.photoUrl}
          initialDayRate={editPerson.dayRate}
          showFinancials={showFinancials}
          squadRoles={data.roleConfig.squad}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, email, salaryId, typicalRole, photoUrl, dayRate) => {
            updatePerson(editTarget, { name, email, salaryId, typicalRole, photoUrl, dayRate });
            setEditTarget(null);
          }}
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
  initialSalaryId?: string;
  initialTypicalRole?: string;
  initialPhotoUrl?: string;
  initialDayRate?: number;
  showFinancials: boolean;
  squadRoles: string[];
  onClose: () => void;
  onSubmit: (name: string, email: string, salaryId?: string, typicalRole?: string, photoUrl?: string, dayRate?: number) => void;
}

function PersonFormModal({ title, initialName = '', initialEmail = '', initialSalaryId = '', initialTypicalRole = '', initialPhotoUrl = '', initialDayRate, showFinancials, squadRoles, onClose, onSubmit }: PersonFormModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [salaryId, setSalaryId] = useState(initialSalaryId);
  const [typicalRole, setTypicalRole] = useState(initialTypicalRole);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [dayRate, setDayRate] = useState(initialDayRate?.toString() ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string; photoUrl?: string; dayRate?: string }>({});

  const handleSubmit = () => {
    const errs: { name?: string; email?: string; photoUrl?: string; dayRate?: string } = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (photoUrl.trim() && !/^https?:\/\//i.test(photoUrl.trim())) errs.photoUrl = 'Photo URL must start with http:// or https://';
    if (showFinancials && dayRate && (isNaN(Number(dayRate)) || Number(dayRate) < 0)) errs.dayRate = 'Enter a valid day rate.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(
      name.trim(),
      email.trim().toLowerCase(),
      salaryId.trim() || undefined,
      typicalRole.trim() || undefined,
      photoUrl.trim() || undefined,
      showFinancials ? (dayRate ? Number(dayRate) : undefined) : initialDayRate,
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
        <Input label="Salary ID" value={salaryId} onChange={(e) => setSalaryId(e.target.value)} placeholder="e.g. SAL-1024" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Typical Role</label>
          <select
            value={typicalRole}
            onChange={(e) => setTypicalRole(e.target.value)}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
          >
            <option value="">Select a role...</option>
            {squadRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        <Input label="Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} error={errors.photoUrl} placeholder="https://example.com/photo.jpg" />
        {showFinancials && (
          <Input label="Day Rate ($)" type="number" value={dayRate} onChange={(e) => setDayRate(e.target.value)} error={errors.dayRate} placeholder="e.g. 650" min="0" />
        )}
      </div>
    </Modal>
  );
}
