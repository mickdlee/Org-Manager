import { useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { Train, Plus, Pencil, Trash2, Users, DollarSign, Briefcase, Download } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { Input, TextArea, Select } from '../components/ui/Input';
import { MemberList } from '../components/members/MemberList';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { duDailyCost, rtDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';
import { generateDUSvg, downloadSvg } from '../utils/svgExport';
import { canManageDeliveryUnit } from '../utils/permissions';
import type { AnyRole, DeliveryUnitOKR, DeliveryUnitKeyResult } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const OKR_YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export function DeliveryUnitPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data,
    addReleaseTrain,
    updateReleaseTrain,
    deleteReleaseTrain,
    addAssignmentToDU,
    removeAssignmentFromDU,
    updateDUAssignment,
    addDeliveryUnitOKR,
    updateDeliveryUnitOKR,
    deleteDeliveryUnitOKR,
    addDUOpenPosition,
    removeDUOpenPosition,
  } = useAppStore();
  const { session } = useAuth();
  const navigate = useNavigate();

  const du = data.deliveryUnits.find((d) => d.id === id);
  if (!du) return <Navigate to="/dashboard" replace />;
  const canEditDU = canManageDeliveryUnit(data, session, du.id);
  const showFinancials = data.uiSettings.showFinancials;

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreateOKR, setShowCreateOKR] = useState(false);
  const [editOKRTarget, setEditOKRTarget] = useState<string | null>(null);
  const [deleteOKRTarget, setDeleteOKRTarget] = useState<string | null>(null);
  const [showCreateOpenPosition, setShowCreateOpenPosition] = useState(false);
  const [deleteOpenPositionTarget, setDeleteOpenPositionTarget] = useState<string | null>(null);
  const [assignOpenPositionTarget, setAssignOpenPositionTarget] = useState<string | null>(null);

  const editRt = du.releaseTrains.find((r) => r.id === editTarget);
  const deleteRt = du.releaseTrains.find((r) => r.id === deleteTarget);
  const okrs = du.okrs ?? [];
  const editOKR = okrs.find((o) => o.id === editOKRTarget);
  const deleteOKR = okrs.find((o) => o.id === deleteOKRTarget);
  const assignOpenPosition = (du.openPositions ?? []).find((pos) => pos.id === assignOpenPositionTarget);

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
        {canEditDU && (
          <Link
            to={`/delivery-units/${du.id}/onboarding`}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Onboarding
          </Link>
        )}
      </div>

      {du.description && <p className="text-sm text-gray-500 mb-6">{du.description}</p>}

      {/* Export button */}
      <div className="mb-6 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            const svg = generateDUSvg(du, data);
            downloadSvg(svg, `${du.name}-orgmap`);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download size={13} /> Export as SVG
        </Button>
      </div>

      {/* Cost summary */}
      {showFinancials && (() => {
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
      {/* OKRs */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Briefcase size={16} /> OKRs
            <span className="text-xs text-gray-400 font-normal">({okrs.length})</span>
          </h2>
          {canEditDU && (
            <Button size="sm" onClick={() => setShowCreateOKR(true)}>
              <Plus size={13} /> New OKR
            </Button>
          )}
        </div>

        {okrs.length === 0 ? (
          <p className="text-sm text-gray-400">No OKRs defined for this Delivery Unit yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Objective</th>
                  <th className="px-3 py-2 text-left">Key Result</th>
                  <th className="px-3 py-2 text-left">Baseline</th>
                  <th className="px-3 py-2 text-left">{OKR_YEARS[0]} Target</th>
                  <th className="px-3 py-2 text-left">{OKR_YEARS[1]} Target</th>
                  <th className="px-3 py-2 text-left">{OKR_YEARS[2]} Target</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2 text-left">Progress</th>
                  <th className="px-3 py-2 text-left">Target Date</th>
                  {canEditDU && <th className="px-3 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {okrs.flatMap((okr) => {
                  const rows = okr.keyResults.length > 0 ? okr.keyResults : [{
                    id: `${okr.id}-empty`,
                    title: 'No key results',
                    baseline: '',
                    notes: '',
                    yearlyTargets: OKR_YEARS.map((year) => ({ year, target: '' })),
                  }];

                  return rows.map((kr, idx) => {
                    const t0 = kr.yearlyTargets.find((t) => t.year === OKR_YEARS[0])?.target ?? '';
                    const t1 = kr.yearlyTargets.find((t) => t.year === OKR_YEARS[1])?.target ?? '';
                    const t2 = kr.yearlyTargets.find((t) => t.year === OKR_YEARS[2])?.target ?? '';
                    return (
                      <tr key={`${okr.id}-${kr.id}`} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 text-gray-700 align-top">{idx === 0 ? okr.objective : ''}</td>
                        <td className="px-3 py-2 text-gray-700 align-top">{kr.title}</td>
                        <td className="px-3 py-2 text-gray-600 align-top">{kr.baseline || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 align-top">{t0 || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 align-top">{t1 || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 align-top">{t2 || '—'}</td>
                        <td className="px-3 py-2 text-gray-600 align-top">{kr.notes || '—'}</td>
                        <td className="px-3 py-2 text-gray-700 align-top">{idx === 0 ? `${okr.progress ?? 0}%` : ''}</td>
                        <td className="px-3 py-2 text-gray-700 align-top">{idx === 0 ? (okr.targetDate || '—') : ''}</td>
                        {canEditDU && (
                          <td className="px-3 py-2 align-top">
                            {idx === 0 && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditOKRTarget(okr.id)} className="text-gray-300 hover:text-gray-600 p-1">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => setDeleteOKRTarget(okr.id)} className="text-gray-300 hover:text-red-500 p-1">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <MemberList
          assignments={du.assignments}
          people={data.people}
          availableRoles={data.roleConfig.deliveryUnit as AnyRole[]}
          isAdmin={canEditDU}
          showFinancials={showFinancials}
          onAdd={(a) => addAssignmentToDU(du.id, a)}
          onRemove={(personId, role) => removeAssignmentFromDU(du.id, personId, role)}
          onUpdate={(personId, role, patch) => updateDUAssignment(du.id, personId, role, patch)}
        />
      </Card>

      {/* Open Positions */}
      {canEditDU && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Briefcase size={16} /> Open Positions
              <span className="text-xs text-gray-400 font-normal">({(du.openPositions ?? []).length})</span>
            </h2>
            <Button size="sm" onClick={() => setShowCreateOpenPosition(true)}>
              <Plus size={13} /> Add Open Position
            </Button>
          </div>
          {(du.openPositions ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No open positions yet.</p>
          ) : (
            <div className="space-y-3">
              {(du.openPositions ?? []).map((pos) => (
                <div
                  key={pos.id}
                  className="rounded-lg p-4 flex items-start gap-4 bg-amber-50 border border-amber-200 relative group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-amber-700 text-sm font-semibold shrink-0 bg-amber-100 ring-2 ring-amber-100">
                    ?
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-semibold text-amber-800 truncate">{pos.title}</p>
                    <p className="text-xs text-amber-700/80">Priority: {pos.priority} · Allocation: {pos.allocationPercentage ?? 100}%</p>
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

      {/* Release Trains */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Train size={16} /> Release Trains
          <span className="text-xs text-gray-400 font-normal">({du.releaseTrains.length})</span>
        </h2>
        {canEditDU && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New Release Train
          </Button>
        )}
      </div>

      {du.releaseTrains.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Train size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No Release Trains yet.{canEditDU ? ' Add one above.' : ''}</p>
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
                {canEditDU && (
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
              {showFinancials && (() => {
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

      {showCreateOKR && (
        <OkrFormModal
          title="New OKR"
          onClose={() => setShowCreateOKR(false)}
          onSubmit={(okr) => {
            addDeliveryUnitOKR(du.id, okr);
            setShowCreateOKR(false);
          }}
        />
      )}

      {editOKRTarget && editOKR && (
        <OkrFormModal
          title="Edit OKR"
          initialObjective={editOKR.objective}
          initialKeyResults={editOKR.keyResults}
          initialProgress={editOKR.progress ?? 0}
          initialTargetDate={editOKR.targetDate ?? ''}
          onClose={() => setEditOKRTarget(null)}
          onSubmit={(okr) => {
            updateDeliveryUnitOKR(du.id, editOKRTarget, okr);
            setEditOKRTarget(null);
          }}
        />
      )}

      {deleteOKRTarget && deleteOKR && (
        <ConfirmDialog
          title="Delete OKR"
          message={`Delete objective "${deleteOKR.objective}"?`}
          onConfirm={() => {
            deleteDeliveryUnitOKR(du.id, deleteOKRTarget);
            setDeleteOKRTarget(null);
          }}
          onCancel={() => setDeleteOKRTarget(null)}
        />
      )}

      {showCreateOpenPosition && (
        <OpenPositionFormModal
          title="Add Open Position"
          onClose={() => setShowCreateOpenPosition(false)}
          onSubmit={(title, priority, allocation) => {
            addDUOpenPosition(du.id, { title, priority, allocationPercentage: allocation });
            setShowCreateOpenPosition(false);
          }}
        />
      )}

      {deleteOpenPositionTarget && (
        <ConfirmDialog
          title="Delete Open Position"
          message="Remove this open position placeholder?"
          onConfirm={() => {
            removeDUOpenPosition(du.id, deleteOpenPositionTarget);
            setDeleteOpenPositionTarget(null);
          }}
          onCancel={() => setDeleteOpenPositionTarget(null)}
        />
      )}

      {assignOpenPosition && (
        <AssignOpenPositionModal
          title="Assign Delivery Unit Role"
          roleTitle={assignOpenPosition.title}
          allocation={assignOpenPosition.allocationPercentage ?? 100}
          people={data.people}
          onClose={() => setAssignOpenPositionTarget(null)}
          onAssign={(personId) => {
            addAssignmentToDU(du.id, {
              personId,
              role: assignOpenPosition.title,
              allocationPercentage: assignOpenPosition.allocationPercentage ?? 100,
            });
            removeDUOpenPosition(du.id, assignOpenPosition.id);
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

function OkrFormModal({
  title,
  initialObjective = '',
  initialKeyResults = [],
  initialProgress = 0,
  initialTargetDate = '',
  onClose,
  onSubmit,
}: {
  title: string;
  initialObjective?: string;
  initialKeyResults?: DeliveryUnitKeyResult[];
  initialProgress?: number;
  initialTargetDate?: string;
  onClose: () => void;
  onSubmit: (okr: Omit<DeliveryUnitOKR, 'id'>) => void;
}) {
  const [objective, setObjective] = useState(initialObjective);
  const [keyResults, setKeyResults] = useState<DeliveryUnitKeyResult[]>(
    initialKeyResults.length > 0
      ? initialKeyResults
      : [{
          id: crypto.randomUUID(),
          title: '',
          baseline: '',
          notes: '',
          yearlyTargets: OKR_YEARS.map((year) => ({ year, target: '' })),
        }],
  );
  const [progress, setProgress] = useState(initialProgress);
  const [targetDate, setTargetDate] = useState(initialTargetDate);
  const [error, setError] = useState('');

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => {
        if (!objective.trim()) {
          setError('Objective is required.');
          return;
        }
        const cleanedKeyResults = keyResults
          .map((kr) => ({
            ...kr,
            title: kr.title.trim(),
            baseline: kr.baseline?.trim() ?? '',
            notes: kr.notes?.trim() ?? '',
            yearlyTargets: OKR_YEARS.map((year) => ({
              year,
              target: kr.yearlyTargets.find((yt) => yt.year === year)?.target?.trim() ?? '',
            })),
          }))
          .filter((kr) => kr.title.length > 0);

        if (cleanedKeyResults.length === 0) {
          setError('Add at least one key result.');
          return;
        }
        onSubmit({
          objective: objective.trim(),
          keyResults: cleanedKeyResults,
          progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
          targetDate: targetDate || undefined,
        });
      }}>Save</Button></>}
    >
      <div className="space-y-4">
        <Input label="Objective" value={objective} onChange={(e) => { setObjective(e.target.value); setError(''); }} error={error} placeholder="e.g. Improve customer onboarding conversion" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-600">Key Results</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setKeyResults((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  title: '',
                  baseline: '',
                  notes: '',
                  yearlyTargets: OKR_YEARS.map((year) => ({ year, target: '' })),
                },
              ])}
            >
              <Plus size={13} /> Add KR
            </Button>
          </div>

          {keyResults.map((kr, idx) => (
            <div key={kr.id} className="rounded border border-gray-200 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-500">KR {idx + 1}</p>
                {keyResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setKeyResults((prev) => prev.filter((x) => x.id !== kr.id))}
                    className="text-gray-300 hover:text-red-500"
                    aria-label="Remove key result"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <Input
                label="Title"
                value={kr.title}
                onChange={(e) => {
                  const value = e.target.value;
                  setKeyResults((prev) => prev.map((x) => (x.id === kr.id ? { ...x, title: value } : x)));
                  setError('');
                }}
                placeholder="e.g. Increase conversion by 15%"
              />

              <Input
                label="Baseline"
                value={kr.baseline ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setKeyResults((prev) => prev.map((x) => (x.id === kr.id ? { ...x, baseline: value } : x)));
                }}
                placeholder="e.g. Current conversion: 22%"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {OKR_YEARS.map((year) => (
                  <div key={`${kr.id}-${year}`}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Target {year}</label>
                    <input
                      value={kr.yearlyTargets.find((yt) => yt.year === year)?.target ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setKeyResults((prev) => prev.map((x) =>
                          x.id !== kr.id
                            ? x
                            : {
                                ...x,
                                yearlyTargets: OKR_YEARS.map((y) => ({
                                  year: y,
                                  target: y === year
                                    ? value
                                    : (x.yearlyTargets.find((yt) => yt.year === y)?.target ?? ''),
                                })),
                              }
                        ));
                      }}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="e.g. 10%"
                    />
                  </div>
                ))}
              </div>

              <TextArea
                label="Notes"
                value={kr.notes ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setKeyResults((prev) => prev.map((x) => (x.id === kr.id ? { ...x, notes: value } : x)));
                }}
                rows={2}
                placeholder="Context, assumptions, dependencies..."
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Progress (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </Modal>
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

function OpenPositionFormModal({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (title: string, priority: 'Low' | 'Medium' | 'High', allocation: number) => void;
}) {
  const [posTitle, setPosTitle] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [allocation, setAllocation] = useState(100);
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
              onSubmit(posTitle.trim(), priority, allocation);
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
      </div>
    </Modal>
  );
}
