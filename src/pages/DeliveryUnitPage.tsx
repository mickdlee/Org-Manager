import { useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { Train, Plus, Pencil, Trash2, Users, DollarSign, Briefcase } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { MemberList } from '../components/members/MemberList';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { duDailyCost, rtDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';
import type { AnyRole } from '../types';

export function DeliveryUnitPage() {
  const { id } = useParams<{ id: string }>();
  const { data, addReleaseTrain, updateReleaseTrain, deleteReleaseTrain, addAssignmentToDU, removeAssignmentFromDU } = useAppStore();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const du = data.deliveryUnits.find((d) => d.id === id);
  if (!du) return <Navigate to="/dashboard" replace />;

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const editRt = du.releaseTrains.find((r) => r.id === editTarget);
  const deleteRt = du.releaseTrains.find((r) => r.id === deleteTarget);

  return (
    <Layout
      title={du.name}
      breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: du.name }]}
    >
      {/* Tab strip */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Overview
        </span>
        <Link
          to={`/delivery-units/${du.id}/onboarding`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Onboarding
        </Link>
      </div>

      {du.description && <p className="text-sm text-gray-500 mb-6">{du.description}</p>}

      {/* Cost summary */}
      {(() => {
        const getPerson = (id: string) => data.people.find((p) => p.id === id);
        const daily = duDailyCost(du, getPerson);
        if (!daily) return null;
        return (
          <div className="flex items-center gap-6 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
            <DollarSign size={16} className="text-blue-400 shrink-0" />
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600"><span className="font-semibold text-gray-800">{formatCost(daily)}</span> /day</span>
              <span className="text-gray-600"><span className="font-semibold text-gray-800">{formatCost(daily * WORKING_DAYS_PER_MONTH)}</span> /month</span>
              <span className="text-xs text-gray-400">total across all teams</span>
            </div>
          </div>
        );
      })()}
      <Card className="mb-6">
        <MemberList
          assignments={du.assignments}
          people={data.people}
          availableRoles={data.roleConfig.deliveryUnit as AnyRole[]}
          isAdmin={isAdmin}
          onAdd={(a) => addAssignmentToDU(du.id, a)}
          onRemove={(personId, role) => removeAssignmentFromDU(du.id, personId, role)}
        />
      </Card>

      {/* Release Trains */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Train size={16} /> Release Trains
          <span className="text-xs text-gray-400 font-normal">({du.releaseTrains.length})</span>
        </h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Release Train
          </Button>
        )}
      </div>

      {du.releaseTrains.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Train size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No Release Trains yet.{isAdmin ? ' Add one above.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {du.releaseTrains.map((rt) => {
            const squadMembers = rt.squads.reduce((sum, sq) => sum + sq.assignments.length, 0);
            const openRoles = rt.squads.reduce((sum, sq) => sum + (sq.onboarding?.openPositions.length ?? 0), 0);
            const pipeline = rt.squads.reduce((sum, sq) => sum + (sq.onboarding?.candidates.length ?? 0), 0);
            return (
            <Card key={rt.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Train size={14} className="text-secondary shrink-0" />
                  <h3 className="font-semibold text-gray-800 truncate text-sm">{rt.name}</h3>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => setEditTarget(rt.id)} className="text-gray-300 hover:text-gray-600 p-1">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setDeleteTarget(rt.id)} className="text-gray-300 hover:text-red-500 p-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
              {rt.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{rt.description}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Users size={11} />{rt.assignments.length} member{rt.assignments.length !== 1 ? 's' : ''}</span>
                <span>{rt.squads.length} squad{rt.squads.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">Squad Members</p>
                  <p className="font-semibold text-gray-700">{squadMembers}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">Total Members</p>
                  <p className="font-semibold text-gray-700">{rt.assignments.length + squadMembers}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                  <p className="text-amber-700">Open Roles</p>
                  <p className="font-semibold text-amber-800">{openRoles}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
                  <p className="text-blue-700">Pipeline</p>
                  <p className="font-semibold text-blue-800">{pipeline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">
                  <Briefcase size={11} /> Delivery Readiness Snapshot
                </span>
              </div>
              {(() => {
                const getPerson = (id: string) => data.people.find((p) => p.id === id);
                const daily = rtDailyCost(rt, getPerson);
                return daily > 0 ? (
                  <p className="text-xs text-gray-500 mb-3">
                    <span className="font-semibold text-gray-700">{formatCost(daily)}</span>/day &nbsp;·&nbsp; {formatCost(daily * WORKING_DAYS_PER_MONTH)}/mo
                  </p>
                ) : null;
              })()}
              <Button variant="ghost" size="sm" onClick={() => navigate(`/release-trains/${du.id}/${rt.id}`)}>
                View Details
              </Button>
            </Card>
          );})}
        </div>
      )}

      {showCreate && (
        <RtFormModal
          title="New Release Train"
          onClose={() => setShowCreate(false)}
          onSubmit={(name, description) => { addReleaseTrain(du.id, { name, description }); setShowCreate(false); }}
        />
      )}
      {editTarget && editRt && (
        <RtFormModal
          title="Edit Release Train"
          initialName={editRt.name}
          initialDescription={editRt.description}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, description) => { updateReleaseTrain(du.id, editTarget, { name, description }); setEditTarget(null); }}
        />
      )}
      {deleteTarget && deleteRt && (
        <ConfirmDialog
          title="Delete Release Train"
          message={`Delete "${deleteRt.name}" and all its Squads?`}
          onConfirm={() => { deleteReleaseTrain(du.id, deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}

function RtFormModal({ title, initialName = '', initialDescription = '', onClose, onSubmit }: { title: string; initialName?: string; initialDescription?: string; onClose: () => void; onSubmit: (n: string, d: string) => void }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');
  return (
    <Modal title={title} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { if (!name.trim()) { setError('Name is required.'); return; } onSubmit(name.trim(), description.trim()); }}>Save</Button></>}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="e.g. ART Phoenix" />
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional…" />
      </div>
    </Modal>
  );
}
