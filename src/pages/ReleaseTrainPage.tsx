import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Shield, Plus, Pencil, Trash2, Users, DollarSign, ChevronDown, Briefcase, Download } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea, Select } from '../components/ui/Input';
import { MemberList } from '../components/members/MemberList';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { squadDailyCost, rtDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';
import { generateRTSvg, downloadSvg } from '../utils/svgExport';
import { canManageReleaseTrain } from '../utils/permissions';
import type { AnyRole } from '../types';

export function ReleaseTrainPage() {
  const { duId, rtId } = useParams<{ duId: string; rtId: string }>();
  const { data, addSquad, updateSquad, deleteSquad, addAssignmentToRT, removeAssignmentFromRT, updateRTAssignment, addRTOpenPosition, removeRTOpenPosition } = useAppStore();
  const { session } = useAuth();
  const navigate = useNavigate();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  if (!du || !rt) return <Navigate to="/dashboard" replace />;
  const canEditRT = canManageReleaseTrain(data, session, du.id, rt.id);
  const showFinancials = data.uiSettings.showFinancials;

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateOpenPosition, setShowCreateOpenPosition] = useState(false);
  const [deleteOpenPositionTarget, setDeleteOpenPositionTarget] = useState<string | null>(null);
  const [assignOpenPositionTarget, setAssignOpenPositionTarget] = useState<string | null>(null);

  const editSq = rt.squads.find((s) => s.id === editTarget);
  const deleteSq = rt.squads.find((s) => s.id === deleteTarget);
  const assignOpenPosition = (rt.openPositions ?? []).find((pos) => pos.id === assignOpenPositionTarget);

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

      {/* Export button */}
      <div className="mb-6 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            const svg = generateRTSvg(du, rt, data);
            downloadSvg(svg, `${rt.name}-orgmap`);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download size={13} /> Export as SVG
        </Button>
      </div>

      {/* Cost summary */}
      {showFinancials && (() => {
        const getPerson = (id: string) => data.people.find((p) => p.id === id);
        const daily = rtDailyCost(rt, getPerson);
        if (!daily) return null;
        return (
          <div className="flex items-center gap-6 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6">
            <DollarSign size={16} className="text-blue-400 shrink-0" />
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600"><span className="font-semibold text-gray-800">{formatCost(daily)}</span> /day</span>
              <span className="text-gray-600"><span className="font-semibold text-gray-800">{formatCost(daily * WORKING_DAYS_PER_MONTH)}</span> /month</span>
              <span className="text-xs text-gray-400">across all squads &amp; members</span>
            </div>
          </div>
        );
      })()}
      <Card className="mb-6">
        <MemberList
          assignments={rt.assignments}
          people={data.people}
          availableRoles={data.roleConfig.releaseTrain as AnyRole[]}
          isAdmin={canEditRT}
          showFinancials={showFinancials}
          onAdd={(a) => addAssignmentToRT(du.id, rt.id, a)}
          onRemove={(personId, role) => removeAssignmentFromRT(du.id, rt.id, personId, role)}
          onUpdate={(personId, role, patch) => updateRTAssignment(du.id, rt.id, personId, role, patch)}
        />
      </Card>

      {/* Open Positions */}
      {canEditRT && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Briefcase size={16} /> Open Positions
              <span className="text-xs text-gray-400 font-normal">({(rt.openPositions ?? []).length})</span>
            </h2>
            <Button size="sm" onClick={() => setShowCreateOpenPosition(true)}>
              <Plus size={13} /> Add Open Position
            </Button>
          </div>
          {(rt.openPositions ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No open positions yet.</p>
          ) : (
            <div className="space-y-3">
              {(rt.openPositions ?? []).map((pos) => (
                <div
                  key={pos.id}
                  className="rounded-lg p-4 flex items-start gap-4 bg-amber-50 border border-amber-200 relative group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-amber-700 text-sm font-semibold shrink-0 bg-amber-100 ring-2 ring-amber-100">
                    ?
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-amber-800 truncate">{pos.title}</p>
                    <p className="text-xs text-amber-700/80">
                      Priority: {pos.priority} · Allocation: {pos.allocationPercentage ?? 100}% · Day Rate: {pos.dayRate ? `$${pos.dayRate}` : '—'}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setAssignOpenPositionTarget(pos.id)}>
                    Assign Person
                  </Button>
                  <button
                    onClick={() => setDeleteOpenPositionTarget(pos.id)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-red-500 transition-all shrink-0 mt-0.5"
                    title="Remove open position"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Squads */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} /> Squads
          <span className="text-xs text-gray-400 font-normal">({rt.squads.length})</span>
        </h2>
        {canEditRT && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Squad
          </Button>
        )}
      </div>

      {rt.squads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Shield size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No Squads yet.{canEditRT ? ' Add one above.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rt.squads.map((sq) => {
            const emptyRoles = sq.onboarding?.openPositions.length ?? 0;
            const pipeline = sq.onboarding?.candidates.length ?? 0;
            const pendingOffboarding = sq.assignments.filter((a) => a.isScheduledOffboarding).length;
            const avgRampUpDays = sq.onboarding?.avgRampUpDays ?? 0;
            const hiringPriority = sq.onboarding?.hiringPriority ?? 'Medium';
            return (
            <Card key={sq.id} className="hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield size={14} className="text-indigo-500 shrink-0" />
                  <h3 className="font-semibold text-gray-800 truncate text-sm">{sq.name}</h3>
                </div>
                {canEditRT && (
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

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">Members</p>
                  <p className="font-semibold text-gray-700">{sq.assignments.length}</p>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                  <p className="text-amber-700">Empty Roles</p>
                  <p className="font-semibold text-amber-800">{emptyRoles}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
                  <p className="text-blue-700">Pipeline</p>
                  <p className="font-semibold text-blue-800">{pipeline}</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-400">Offboarding</p>
                  <p className="font-semibold text-gray-700">{pendingOffboarding}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-3">
                <span className="font-medium text-gray-700">Priority:</span> {hiringPriority}
                &nbsp;·&nbsp;
                <span className="font-medium text-gray-700">Ramp-up:</span> {avgRampUpDays} days
              </p>

              <details className="mb-3 rounded border border-gray-200 bg-gray-50 group">
                <summary className="list-none cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-700 flex items-center justify-between">
                  <span>Squad Members</span>
                  <ChevronDown size={13} className="text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-gray-200 px-3 py-2">
                  {sq.assignments.length === 0 ? (
                    <p className="text-xs text-gray-400">No members assigned.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sq.assignments.map((assignment, idx) => {
                        const person = data.people.find((p) => p.id === assignment.personId);
                        return (
                          <div key={`${assignment.personId}-${assignment.role}-${idx}`} className="text-xs grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                            <span className="text-gray-700 truncate">{person?.name ?? 'Unknown'}</span>
                            <span className="text-gray-500">{assignment.role}</span>
                            <span className="font-medium text-gray-700">{assignment.allocationPercentage ?? 100}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>

              {showFinancials && (() => {
                const getPerson = (id: string) => data.people.find((p) => p.id === id);
                const daily = squadDailyCost(sq, getPerson);
                return daily > 0 ? (
                  <p className="text-xs text-gray-500 mb-3">
                    <span className="font-semibold text-gray-700">{formatCost(daily)}</span>/day &nbsp;·&nbsp; {formatCost(daily * WORKING_DAYS_PER_MONTH)}/mo
                  </p>
                ) : null;
              })()}
              <Button variant="ghost" size="sm" onClick={() => navigate(`/squads/${du.id}/${rt.id}/${sq.id}`)}>
                View Details
              </Button>
            </Card>
          );})}
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

      {showCreateOpenPosition && (
        <OpenPositionFormModal
          title="Add Open Position"
          onClose={() => setShowCreateOpenPosition(false)}
          onSubmit={(title, priority, allocation, dayRate) => {
            addRTOpenPosition(du.id, rt.id, { title, priority, allocationPercentage: allocation, dayRate });
            setShowCreateOpenPosition(false);
          }}
        />
      )}

      {deleteOpenPositionTarget && (
        <ConfirmDialog
          title="Delete Open Position"
          message="Remove this open position placeholder?"
          onConfirm={() => {
            removeRTOpenPosition(du.id, rt.id, deleteOpenPositionTarget);
            setDeleteOpenPositionTarget(null);
          }}
          onCancel={() => setDeleteOpenPositionTarget(null)}
        />
      )}

      {assignOpenPosition && (
        <AssignOpenPositionModal
          title="Assign Release Train Role"
          roleTitle={assignOpenPosition.title}
          allocation={assignOpenPosition.allocationPercentage ?? 100}
          people={data.people}
          onClose={() => setAssignOpenPositionTarget(null)}
          onAssign={(personId) => {
            addAssignmentToRT(du.id, rt.id, {
              personId,
              role: assignOpenPosition.title,
              allocationPercentage: assignOpenPosition.allocationPercentage ?? 100,
            });
            removeRTOpenPosition(du.id, rt.id, assignOpenPosition.id);
            setAssignOpenPositionTarget(null);
          }}
        />
      )}
    </Layout>
  );
}

function AssignOpenPositionModal({
  title,
  roleTitle,
  allocation,
  people,
  onClose,
  onAssign,
}: {
  title: string;
  roleTitle: string;
  allocation: number;
  people: Array<{ id: string; name: string; email: string; typicalRole?: string }>;
  onClose: () => void;
  onAssign: (personId: string) => void;
}) {
  const [personId, setPersonId] = useState(people[0]?.id ?? '');
  const [error, setError] = useState('');

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => {
            if (!personId) {
              setError('Please select a person.');
              return;
            }
            onAssign(personId);
          }}>
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">{roleTitle}</p>
          <p className="text-xs text-amber-700">Allocation: {allocation}%</p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Person</label>
          <select
            value={personId}
            onChange={(e) => { setPersonId(e.target.value); setError(''); }}
            className="block w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
          >
            <option value="">Select a person...</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}{person.typicalRole ? ` · ${person.typicalRole}` : ''}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </Modal>
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

function OpenPositionFormModal({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (title: string, priority: 'Low' | 'Medium' | 'High', allocation: number, dayRate?: number) => void;
}) {
  const [posTitle, setPosTitle] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [allocation, setAllocation] = useState(100);
  const [dayRate, setDayRate] = useState('');
  const [error, setError] = useState('');

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!posTitle.trim()) {
                setError('Title is required.');
                return;
              }
              const parsedDayRate = dayRate.trim() === '' ? undefined : Number(dayRate);
              if (parsedDayRate !== undefined && (!Number.isFinite(parsedDayRate) || parsedDayRate < 0)) {
                setError('Day rate must be a positive number.');
                return;
              }
              onSubmit(posTitle.trim(), priority, allocation, parsedDayRate);
            }}
          >
            Add
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Role Title"
          value={posTitle}
          onChange={(e) => setPosTitle(e.target.value)}
          error={error}
          placeholder="e.g. Senior Cloud Architect"
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}
          options={[
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
          ]}
        />
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Allocation (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={allocation}
            onChange={(e) => setAllocation(Number(e.target.value))}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Day Rate (Forecast)</label>
          <input
            type="number"
            min={0}
            value={dayRate}
            onChange={(e) => setDayRate(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="1200"
          />
        </div>
      </div>
    </Modal>
  );
}
