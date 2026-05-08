import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Train, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';

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
          {data.deliveryUnits.map((du) => (
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
              {du.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{du.description}</p>}

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Train size={12} /> {du.releaseTrains.length} Release Train{du.releaseTrains.length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><Users size={12} /> {du.assignments.length} Member{du.assignments.length !== 1 ? 's' : ''}</span>
              </div>

              <Button variant="ghost" size="sm" onClick={() => navigate(`/delivery-units/${du.id}`)}>
                View Details
              </Button>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <EntityFormModal
          title="New Delivery Unit"
          onClose={() => setShowCreate(false)}
          onSubmit={(name, description) => {
            addDeliveryUnit({ name, description });
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && editDu && (
        <EntityFormModal
          title="Edit Delivery Unit"
          initialName={editDu.name}
          initialDescription={editDu.description}
          onClose={() => setEditTarget(null)}
          onSubmit={(name, description) => {
            updateDeliveryUnit(editTarget, { name, description });
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
  initialDescription?: string;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}

function EntityFormModal({ title, initialName = '', initialDescription = '', onClose, onSubmit }: EntityFormModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    onSubmit(name.trim(), description.trim());
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
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description…" />
      </div>
    </Modal>
  );
}
