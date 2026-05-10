import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Calculator } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { canManageDeliveryUnit } from '../utils/permissions';
import {
  buildDefaultAllocationSet,
  calculateDeliveryUnitFinancials,
  formatMonthKey,
  type FinancialAllocationKind,
} from '../utils/financials';
import { formatCost } from '../utils/cost';
import type { DeliverableAllocationSet, DeliverableStatus, FundedDeliverable } from '../types';

const STATUS_OPTIONS: DeliverableStatus[] = ['Planned', 'In Progress', 'At Risk', 'Complete'];

export function DeliveryUnitFinancialsPage() {
  const { duId } = useParams<{ duId: string }>();
  const {
    data,
    addFundedDeliverable,
    updateFundedDeliverable,
    deleteFundedDeliverable,
    setSquadFinancialAllocation,
  } = useAppStore();
  const { session } = useAuth();

  const du = data.deliveryUnits.find((item) => item.id === duId);
  if (!du) return <Navigate to="/dashboard" replace />;

  const canEditDU = canManageDeliveryUnit(data, session, du.id);
  const fundedDeliverables = du.fundedDeliverables ?? [];
  const allSquads = du.releaseTrains.flatMap((rt) => rt.squads);

  const [month, setMonth] = useState(formatMonthKey(new Date()));
  const [showCreateDeliverable, setShowCreateDeliverable] = useState(false);
  const [editDeliverableId, setEditDeliverableId] = useState<string | null>(null);
  const [deleteDeliverableId, setDeleteDeliverableId] = useState<string | null>(null);

  const editDeliverable = fundedDeliverables.find((item) => item.id === editDeliverableId);
  const deleteDeliverableTarget = fundedDeliverables.find((item) => item.id === deleteDeliverableId);

  const summary = useMemo(() => calculateDeliveryUnitFinancials(data, du, month), [data, du, month]);

  const updateAllocationCell = (
    squadId: string,
    kind: FinancialAllocationKind,
    deliverableId: string,
    value: string,
  ) => {
    if (!canEditDU) return;

    const numericValue = value.trim() === '' ? 0 : Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return;

    const current = du.financialsByMonth?.[month]?.squadAllocations?.[squadId]?.[kind] ?? {};
    const next: DeliverableAllocationSet = {
      ...current,
      [deliverableId]: numericValue,
    };
    setSquadFinancialAllocation(du.id, month, squadId, kind, next);
  };

  const applyEqualSplit = (squadId: string, kind: FinancialAllocationKind) => {
    if (!canEditDU) return;
    const split = buildDefaultAllocationSet(fundedDeliverables);
    setSquadFinancialAllocation(du.id, month, squadId, kind, split);
  };

  return (
    <Layout
      title={`${du.name} Financials`}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: 'Financials' },
      ]}
    >
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          to={`/delivery-units/${du.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Overview
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Financials
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

      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-700">Reporting Month</h2>
          <div className="w-52">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Squad-level allocations must sum to 100% for both Actual and Forecast each month.
          DU and RT assignment costs are auto-distributed by aggregated squad allocation mix.
        </p>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Funded Deliverables</h2>
          {canEditDU && (
            <Button size="sm" onClick={() => setShowCreateDeliverable(true)}>
              <Plus size={13} /> Add Deliverable
            </Button>
          )}
        </div>

        {fundedDeliverables.length === 0 ? (
          <p className="text-sm text-gray-500">No funded deliverables yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Start</th>
                  <th className="px-3 py-2 text-left">End</th>
                  <th className="px-3 py-2 text-left">Funding</th>
                  {canEditDU && <th className="px-3 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {fundedDeliverables.map((deliverable) => (
                  <tr key={deliverable.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-700">{deliverable.code || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 font-medium">{deliverable.name}</td>
                    <td className="px-3 py-2 text-gray-600">{deliverable.owner || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{deliverable.status}</td>
                    <td className="px-3 py-2 text-gray-600">{deliverable.startDate || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{deliverable.endDate || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(deliverable.fundingAmount)}</td>
                    {canEditDU && (
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditDeliverableId(deliverable.id)}
                            className="text-gray-300 hover:text-gray-600 p-1"
                            title="Edit deliverable"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteDeliverableId(deliverable.id)}
                            className="text-gray-300 hover:text-red-500 p-1"
                            title="Delete deliverable"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Squad Allocation Matrix ({month})</h2>
          <span className="text-xs text-gray-400">Actual and Forecast must each total 100%</span>
        </div>

        {fundedDeliverables.length === 0 || allSquads.length === 0 ? (
          <p className="text-sm text-gray-500">Add funded deliverables and squads to enter monthly allocations.</p>
        ) : (
          <div className="space-y-5">
            {allSquads.map((sq) => {
              const actual = du.financialsByMonth?.[month]?.squadAllocations?.[sq.id]?.actual ?? {};
              const forecast = du.financialsByMonth?.[month]?.squadAllocations?.[sq.id]?.forecast ?? {};
              const actualValidation = summary.actualValidation.find((item) => item.squadId === sq.id);
              const forecastValidation = summary.forecastValidation.find((item) => item.squadId === sq.id);

              return (
                <div key={sq.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">{sq.name}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => applyEqualSplit(sq.id, 'actual')}
                        disabled={!canEditDU}
                      >
                        Equal Split Actual
                      </button>
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => applyEqualSplit(sq.id, 'forecast')}
                        disabled={!canEditDU}
                      >
                        Equal Split Forecast
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                          <th className="px-3 py-2 text-left">Deliverable</th>
                          <th className="px-3 py-2 text-left">Actual %</th>
                          <th className="px-3 py-2 text-left">Forecast %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fundedDeliverables.map((deliverable) => (
                          <tr key={`${sq.id}-${deliverable.id}`} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 text-gray-700">{deliverable.name}</td>
                            <td className="px-3 py-2 text-gray-700">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                disabled={!canEditDU}
                                value={actual[deliverable.id] ?? 0}
                                onChange={(e) => updateAllocationCell(sq.id, 'actual', deliverable.id, e.target.value)}
                                className="w-24 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                disabled={!canEditDU}
                                value={forecast[deliverable.id] ?? 0}
                                onChange={(e) => updateAllocationCell(sq.id, 'forecast', deliverable.id, e.target.value)}
                                className="w-24 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-2 flex items-center gap-6 text-xs">
                    <span className={actualValidation?.isValid ? 'text-emerald-700' : 'text-red-600'}>
                      Actual Total: {actualValidation?.totalPercent ?? 0}%
                    </span>
                    <span className={forecastValidation?.isValid ? 'text-emerald-700' : 'text-red-600'}>
                      Forecast Total: {forecastValidation?.totalPercent ?? 0}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-700">Actuals and Forecast Rollup ({month})</h2>
        </div>

        {summary.byDeliverable.length === 0 ? (
          <p className="text-sm text-gray-500">No deliverables to calculate.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Deliverable</th>
                  <th className="px-3 py-2 text-left">Funding</th>
                  <th className="px-3 py-2 text-left">Actual /month</th>
                  <th className="px-3 py-2 text-left">Forecast /month</th>
                  <th className="px-3 py-2 text-left">Actual Variance</th>
                  <th className="px-3 py-2 text-left">Forecast Variance</th>
                </tr>
              </thead>
              <tbody>
                {summary.byDeliverable.map((row) => (
                  <tr key={row.deliverableId} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-gray-400 ml-1">{row.code ? `(${row.code})` : ''}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.fundingAmount)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.actualMonthly)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.forecastMonthly)}</td>
                    <td className={`px-3 py-2 ${row.varianceActualMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(row.varianceActualMonthly)}
                    </td>
                    <td className={`px-3 py-2 ${row.varianceForecastMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(row.varianceForecastMonthly)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold text-gray-700">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{formatCost(summary.totals.funded)}</td>
                  <td className="px-3 py-2">{formatCost(summary.totals.actualMonthly)}</td>
                  <td className="px-3 py-2">{formatCost(summary.totals.forecastMonthly)}</td>
                  <td className={`px-3 py-2 ${summary.totals.funded - summary.totals.actualMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCost(summary.totals.funded - summary.totals.actualMonthly)}
                  </td>
                  <td className={`px-3 py-2 ${summary.totals.funded - summary.totals.forecastMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCost(summary.totals.funded - summary.totals.forecastMonthly)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreateDeliverable && (
        <FundedDeliverableModal
          title="Add Funded Deliverable"
          onClose={() => setShowCreateDeliverable(false)}
          onSubmit={(payload) => {
            addFundedDeliverable(du.id, payload);
            setShowCreateDeliverable(false);
          }}
        />
      )}

      {editDeliverable && (
        <FundedDeliverableModal
          title="Edit Funded Deliverable"
          initial={editDeliverable}
          onClose={() => setEditDeliverableId(null)}
          onSubmit={(payload) => {
            updateFundedDeliverable(du.id, editDeliverable.id, payload);
            setEditDeliverableId(null);
          }}
        />
      )}

      {deleteDeliverableTarget && (
        <ConfirmDialog
          title="Delete Deliverable"
          message={`Delete ${deleteDeliverableTarget.name}? Existing monthly allocations for this deliverable will be removed.`}
          onConfirm={() => {
            deleteFundedDeliverable(du.id, deleteDeliverableTarget.id);
            setDeleteDeliverableId(null);
          }}
          onCancel={() => setDeleteDeliverableId(null)}
        />
      )}
    </Layout>
  );
}

function FundedDeliverableModal({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: FundedDeliverable;
  onClose: () => void;
  onSubmit: (payload: Omit<FundedDeliverable, 'id'>) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [owner, setOwner] = useState(initial?.owner ?? '');
  const [status, setStatus] = useState<DeliverableStatus>(initial?.status ?? 'Planned');
  const [startDate, setStartDate] = useState(initial?.startDate ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [fundingAmount, setFundingAmount] = useState(String(initial?.fundingAmount ?? 0));
  const [error, setError] = useState('');

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                setError('Name is required.');
                return;
              }
              const funding = Number(fundingAmount);
              if (!Number.isFinite(funding) || funding < 0) {
                setError('Funding amount must be a positive number.');
                return;
              }

              onSubmit({
                code: code.trim(),
                name: name.trim(),
                owner: owner.trim(),
                status,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                fundingAmount: funding,
              });
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="FD-001" />
        <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} error={error} />
        <Input label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner name" />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
          options={STATUS_OPTIONS.map((value) => ({ label: value, value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Input
          label="Funding Amount"
          type="number"
          min={0}
          value={fundingAmount}
          onChange={(e) => {
            setFundingAmount(e.target.value);
            setError('');
          }}
        />
      </div>
    </Modal>
  );
}
