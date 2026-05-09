import { useRef, useState } from 'react';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, TextArea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { personTotalAllocationPercent, personAllocationBreakdown } from '../utils/cost';
import { initialsFromName } from '../utils/avatar';

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

const SAMPLE_PEOPLE_CSV = [
  'name,email,salaryId,typicalRole,capabilityNotes,photoUrl,dayRate',
  'Jane Smith,jane.smith@example.com,SAL-1024,Developer,"API design, mentoring, test automation",,650',
  'Marcus Lee,marcus.lee@example.com,SAL-2048,Product Owner,"Backlog shaping, stakeholder management",,900',
].join('\n');


export function PeoplePage() {
  const { data, addPerson, updatePerson, deletePerson } = useAppStore();
  const { isAdmin } = useAuth();
  const showFinancials = data.uiSettings.showFinancials;

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = data.people.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.salaryId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.typicalRole ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.capabilityNotes ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const editPerson = data.people.find((p) => p.id === editTarget);
  const deletePerson_ = data.people.find((p) => p.id === deleteTarget);

  const handleCsvImport = async (file: File | undefined) => {
    if (!file) return;

    setImportError('');
    setImportMessage('');

    try {
      const text = await file.text();
      const rows = parseCsvText(text);

      if (rows.length === 0) {
        setImportError('No importable rows found. Include a header row and at least one person row.');
        return;
      }

      const existingEmails = new Set(data.people.map((person) => person.email.toLowerCase()));
      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        const name = (row.name ?? row.Name ?? '').trim();
        const email = (row.email ?? row.Email ?? '').trim().toLowerCase();

        if (!name || !email) {
          skipped += 1;
          continue;
        }

        if (existingEmails.has(email)) {
          skipped += 1;
          continue;
        }

        const dayRateRaw = (row.dayRate ?? row.DayRate ?? row['Day Rate'] ?? '').trim();
        const dayRate = dayRateRaw ? Number(dayRateRaw) : undefined;

        addPerson({
          name,
          email,
          salaryId: (row.salaryId ?? row.SalaryId ?? row['Salary ID'] ?? '').trim() || undefined,
          typicalRole: (row.typicalRole ?? row.TypicalRole ?? row['Typical Role'] ?? '').trim() || undefined,
          capabilityNotes: (row.capabilityNotes ?? row.CapabilityNotes ?? row['Capability Notes'] ?? '').trim() || undefined,
          photoUrl: (row.photoUrl ?? row.PhotoUrl ?? row['Photo URL'] ?? '').trim() || undefined,
          dayRate: typeof dayRate === 'number' && !Number.isNaN(dayRate) ? dayRate : undefined,
        });

        existingEmails.add(email);
        imported += 1;
      }

      setImportMessage(`Imported ${imported} people.${skipped > 0 ? ` Skipped ${skipped} duplicate or invalid rows.` : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import CSV file.';
      setImportError(message);
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_PEOPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people-import-sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleDownloadSampleCsv}>
              Download Sample CSV
            </Button>
            <Button variant="ghost" onClick={() => csvInputRef.current?.click()}>
              Import CSV
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void handleCsvImport(e.target.files?.[0])}
              className="hidden"
            />
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add Person
            </Button>
          </div>
        )}
      </div>

      {(importMessage || importError) && (
        <div className={`mb-4 rounded border px-3 py-2 text-sm ${importError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {importError || importMessage}
        </div>
      )}

      {isAdmin && (
        <p className="text-xs text-gray-500 mb-4">
          CSV columns supported: `name`, `email`, `salaryId`, `typicalRole`, `capabilityNotes`, `photoUrl`, `dayRate`.
        </p>
      )}

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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Capability Notes</th>
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
                  <td className="px-4 py-3 text-gray-600 max-w-56 truncate" title={p.capabilityNotes}>{p.capabilityNotes ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center">
                        {initialsFromName(p.name)}
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
          onSubmit={(name, email, salaryId, typicalRole, capabilityNotes, photoUrl, dayRate) => {
            addPerson({ name, email, salaryId, typicalRole, capabilityNotes, photoUrl, dayRate });
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
          initialCapabilityNotes={editPerson.capabilityNotes}
          initialPhotoUrl={editPerson.photoUrl}
          initialDayRate={editPerson.dayRate}
          showFinancials={showFinancials}
          squadRoles={data.roleConfig.squad}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, email, salaryId, typicalRole, capabilityNotes, photoUrl, dayRate) => {
            updatePerson(editTarget, { name, email, salaryId, typicalRole, capabilityNotes, photoUrl, dayRate });
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
  initialCapabilityNotes?: string;
  initialPhotoUrl?: string;
  initialDayRate?: number;
  showFinancials: boolean;
  squadRoles: string[];
  onClose: () => void;
  onSubmit: (name: string, email: string, salaryId?: string, typicalRole?: string, capabilityNotes?: string, photoUrl?: string, dayRate?: number) => void;
}

function PersonFormModal({ title, initialName = '', initialEmail = '', initialSalaryId = '', initialTypicalRole = '', initialCapabilityNotes = '', initialPhotoUrl = '', initialDayRate, showFinancials, squadRoles, onClose, onSubmit }: PersonFormModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [salaryId, setSalaryId] = useState(initialSalaryId);
  const [typicalRole, setTypicalRole] = useState(initialTypicalRole);
  const [capabilityNotes, setCapabilityNotes] = useState(initialCapabilityNotes);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [dayRate, setDayRate] = useState(initialDayRate?.toString() ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string; photoUrl?: string; dayRate?: string }>({});

  const resizeAndCompressImage = (dataUrl: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDimension = 512;
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not available for image processing.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => reject(new Error('Unable to process selected image.'));
    img.src = dataUrl;
  });

  const handlePhotoUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photoUrl: 'Please choose an image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      try {
        const optimized = await resizeAndCompressImage(result);
        setPhotoUrl(optimized);
        setErrors((prev) => ({ ...prev, photoUrl: undefined }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to read selected image.';
        setErrors((prev) => ({ ...prev, photoUrl: message }));
      }
    };
    reader.onerror = () => {
      setErrors((prev) => ({ ...prev, photoUrl: 'Unable to read selected image.' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const errs: { name?: string; email?: string; photoUrl?: string; dayRate?: string } = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (photoUrl.trim() && !/^https?:\/\//i.test(photoUrl.trim()) && !photoUrl.startsWith('data:image/')) {
      errs.photoUrl = 'Photo must be an image upload or a URL starting with http:// or https://';
    }
    if (showFinancials && dayRate && (isNaN(Number(dayRate)) || Number(dayRate) < 0)) errs.dayRate = 'Enter a valid day rate.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(
      name.trim(),
      email.trim().toLowerCase(),
      salaryId.trim() || undefined,
      typicalRole.trim() || undefined,
      capabilityNotes.trim() || undefined,
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
        <TextArea label="Capability Notes" value={capabilityNotes} onChange={(e) => setCapabilityNotes(e.target.value)} rows={3} placeholder="e.g. API design, mentoring, cloud migration, test automation" />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Upload Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm text-gray-800 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-sm file:font-medium file:text-gray-700 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
          />
        </div>
        <Input label="Photo URL" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} error={errors.photoUrl} placeholder="https://example.com/photo.jpg" />
        {photoUrl && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Photo Preview</label>
            <div className="border border-gray-200 rounded p-2 bg-gray-50 inline-flex w-fit">
              <img src={photoUrl} alt="Preview" className="w-20 h-20 rounded object-cover" />
            </div>
          </div>
        )}
        {showFinancials && (
          <Input label="Day Rate ($)" type="number" value={dayRate} onChange={(e) => setDayRate(e.target.value)} error={errors.dayRate} placeholder="e.g. 650" min="0" />
        )}
      </div>
    </Modal>
  );
}
