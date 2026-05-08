import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Train, Users, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { duDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';
import { DELIVERY_UNIT_TYPES, type DeliveryUnitType } from '../types';

export function DashboardPage() {
  const { data, addDeliveryUnit, updateDeliveryUnit, deleteDeliveryUnit } = useAppStore();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const editDu = data.deliveryUnits.find((d) => d.id === editTarget);
  const deleteDu = data.deliveryUnits.find((d) => d.id === deleteTarget);

  return (
    <Layout title="Dashboard">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {data.deliveryUnits.length} Delivery Unit{data.deliveryUnits.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New Delivery Unit
          </Button>
        )}
      </div>

      {data.deliveryUnits.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No Delivery Units yet.{isAdmin ? ' Create one to get started.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.deliveryUnits.map((du) => {
            const totalSquads = du.releaseTrains.reduce((sum, rt) => sum + rt.squads.length, 0);
            const duMembers = du.assignments.length;
            const rtMembers = du.releaseTrains.reduce((sum, rt) => sum + rt.assignments.length, 0);
            const squadMembers = du.releaseTrains.reduce(
              (sum, rt) => sum + rt.squads.reduce((sqSum, sq) => sqSum + sq.assignments.length, 0),
              0,
            );
            const totalOpenRoles = du.releaseTrains.reduce(
              (sum, rt) => sum + rt.squads.reduce((sqSum, sq) => sqSum + (sq.onboarding?.openPositions.length ?? 0), 0),
              0,
            );
            const totalCandidates = du.releaseTrains.reduce(
              (sum, rt) => sum + rt.squads.reduce((sqSum, sq) => sqSum + (sq.onboarding?.candidates.length ?? 0), 0),
              0,
            );
            const health = du.onboarding?.overallHealthStatus ?? 'Healthy';
            return (
            <Card key={du.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={16} className="text-primary shrink-0" />
                  <h2 className="font-semibold text-gray-800 truncate">{du.name}</h2>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => setEditTarget(du.id)} className="text-gray-300 hover:text-gray-600 transition-colors p-1">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(du.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 inline-block mb-2">
                {du.type}
              </p>
              {du.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{du.description}</p>}

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Train size={12} /> {du.releaseTrains.length} Release Train{du.releaseTrains.length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {du.assignments.length} Member{du.assignments.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">Squads</p>
                  <p className="font-semibold text-gray-700">{totalSquads}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">All Members</p>
                  <p className="font-semibold text-gray-700">{duMembers + rtMembers + squadMembers}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                  <p className="text-amber-700">Open Roles</p>
                  <p className="font-semibold text-amber-800">{totalOpenRoles}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
                  <p className="text-blue-700">Pipeline</p>
                  <p className="font-semibold text-blue-800">{totalCandidates}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs mb-4">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-600">
                  <Briefcase size={11} /> Health: {health}
                </span>
              </div>
              {(() => {
                const getPerson = (id: string) => data.people.find((p) => p.id === id);
                const daily = duDailyCost(du, getPerson);
                return daily > 0 ? (
                  <p className="text-xs text-gray-500 mb-4">
                    <span className="font-semibold text-gray-700">{formatCost(daily)}</span>/day &nbsp;·&nbsp; <span className="font-semibold text-gray-700">{formatCost(daily * WORKING_DAYS_PER_MONTH)}</span>/mo
                  </p>
                ) : null;
              })()}

              <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery-units/${du.id}`)}>
                View Details
              </Button>
            </Card>
          );})}
        </div>
      )}

      {showCreate && (
        <EntityFormModal
          title="New Delivery Unit"
          onClose={() => setShowCreate(false)}
          onSubmit={(name, type, description) => {
            addDeliveryUnit({ name, type, description });
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && editDu && (
        <EntityFormModal
          title="Edit Delivery Unit"
          initialName={editDu.name}
          initialType={editDu.type}
          initialDescription={editDu.description}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, type, description) => {
            updateDeliveryUnit(editTarget, { name, type, description });
            setEditTarget(null);
          }}
        />
      )}

      {deleteTarget && deleteDu && (
        <ConfirmDialog
          title="Delete Delivery Unit"
          message={`Delete "${deleteDu.name}" and all its Release Trains and Squads? This cannot be undone.`}
          onConfirm={() => { deleteDeliveryUnit(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}

interface EntityFormModalProps {
  title: string;
  initialName?: string;
  initialType?: DeliveryUnitType;
  initialDescription?: string;
  onClose: () => void;
  onSubmit: (name: string, type: DeliveryUnitType, description: string) => void;
}

function EntityFormModal({ title, initialName = '', initialType = 'Supporting', initialDescription = '', onClose, onSubmit }: EntityFormModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<DeliveryUnitType>(initialType);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    onSubmit(name.trim(), type, description.trim());
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="e.g. Platform Engineering" />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DeliveryUnitType)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            {DELIVERY_UNIT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description…" />
      </div>
    </Modal>
  );
}
