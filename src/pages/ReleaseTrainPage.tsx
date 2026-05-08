import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Shield, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { MemberList } from '../components/members/MemberList';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import type { AnyRole } from '../types';

export function ReleaseTrainPage() {
  const { duId, rtId } = useParams<{ duId: string; rtId: string }>();
  const { data, addSquad, updateSquad, deleteSquad, addAssignmentToRT, removeAssignmentFromRT } = useAppStore();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  if (!du || !rt) return <Navigate to="/dashboard" replace />;

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const editSq = rt.squads.find((s) => s.id === editTarget);
  const deleteSq = rt.squads.find((s) => s.id === deleteTarget);

  return (
    <Layout
      title={rt.name}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: rt.name },
      ]}
    >
      {rt.description && <p className="text-sm text-gray-500 mb-6">{rt.description}</p>}

      {/* Members */}
      <Card className="mb-6">
        <MemberList
          assignments={rt.assignments}
          people={data.people}
          availableRoles={data.roleConfig.releaseTrain as AnyRole[]}
          isAdmin={isAdmin}
          onAdd={(a) => addAssignmentToRT(du.id, rt.id, a)}
          onRemove={(personId, role) => removeAssignmentFromRT(du.id, rt.id, personId, role)}
        />
      </Card>

      {/* Squads */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} /> Squads
          <span className="text-xs text-gray-400 font-normal">({rt.squads.length})</span>
        </h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Squad
          </Button>
        )}
      </div>

      {rt.squads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Shield size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No Squads yet.{isAdmin ? ' Add one above.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rt.squads.map((sq) => (
            <Card key={sq.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={14} className="text-indigo-500 shrink-0" />
                  <h3 className="font-semibold text-gray-800 truncate text-sm">{sq.name}</h3>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => setEditTarget(sq.id)} className="text-gray-300 hover:text-gray-600 p-1"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteTarget(sq.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
              {sq.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{sq.description}</p>}
              <div className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                <Users size={11} />{sq.assignments.length} member{sq.assignments.length !== 1 ? 's' : ''}
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/squads/${du.id}/${rt.id}/${sq.id}`)}>
                View Details
              </Button>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <SqFormModal title="New Squad" onClose={() => setShowCreate(false)} onSubmit={(n, d) => { addSquad(du.id, rt.id, { name: n, description: d }); setShowCreate(false); }} />
      )}
      {editTarget && editSq && (
        <SqFormModal title="Edit Squad" initialName={editSq.name} initialDescription={editSq.description} onClose={() => setEditTarget(null)} onSubmit={(n, d) => { updateSquad(du.id, rt.id, editTarget, { name: n, description: d }); setEditTarget(null); }} />
      )}
      {deleteTarget && deleteSq && (
        <ConfirmDialog title="Delete Squad" message={`Delete "${deleteSq.name}"?`} onConfirm={() => { deleteSquad(du.id, rt.id, deleteTarget); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      )}
    </Layout>
  );
}

function SqFormModal({ title, initialName = '', initialDescription = '', onClose, onSubmit }: { title: string; initialName?: string; initialDescription?: string; onClose: () => void; onSubmit: (n: string, d: string) => void }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');
  return (
    <Modal title={title} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (!name.trim()) { setError('Name is required.'); return; } onSubmit(name.trim(), description.trim()); }}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="e.g. Payments Squad" />
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional…" />
      </div>
    </Modal>
  );
}
