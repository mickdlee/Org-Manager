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
  calculateDeliveryUnitFinancialYearProjection,
} from '../utils/financials';
import { formatCost } from '../utils/cost';
import type { DeliverableStatus, FundedDeliverable } from '../types';

const STATUS_OPTIONS: DeliverableStatus[] = ['Planned', 'In Progress', 'At Risk', 'Complete'];

export function DeliveryUnitFinancialsPage() {
  const { duId } = useParams<{ duId: string }>();
  const {
    data,
    addFundedDeliverable,
    updateFundedDeliverable,
    deleteFundedDeliverable,
  } = useAppStore();
  const { session } = useAuth();

  const du = data.deliveryUnits.find((item) => item.id === duId);
  if (!du) return <Navigate to="/dashboard" replace />;

  const canEditDU = canManageDeliveryUnit(data, session, du.id);
  const fundedDeliverables = du.fundedDeliverables ?? [];

  const [showCreateDeliverable, setShowCreateDeliverable] = useState(false);
  const [editDeliverableId, setEditDeliverableId] = useState<string | null>(null);
  const [deleteDeliverableId, setDeleteDeliverableId] = useState<string | null>(null);

  const editDeliverable = fundedDeliverables.find((item) => item.id === editDeliverableId);
  const deleteDeliverableTarget = fundedDeliverables.find((item) => item.id === deleteDeliverableId);

  const fyProjection = useMemo(
    () => calculateDeliveryUnitFinancialYearProjection(data, du, new Date()),
    [data, du],
  );

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
          <h2 className="font-semibold text-gray-700">Current FY Funding Position</h2>
          <span className="text-xs text-gray-500">Current month: {formatMonthLabel(fyProjection.currentMonthKey)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          <div className="border border-gray-200 rounded p-3">
            <p className="text-gray-500 uppercase tracking-wide">Initial Funding</p>
            <p className="text-base font-semibold text-gray-800">{formatCost(fyProjection.totals.initialFunding)}</p>
          </div>
          <div className="border border-gray-200 rounded p-3">
            <p className="text-gray-500 uppercase tracking-wide">Spent To Date</p>
            <p className="text-base font-semibold text-gray-800">{formatCost(fyProjection.totals.actualSpendToDate)}</p>
          </div>
          <div className="border border-gray-200 rounded p-3">
            <p className="text-gray-500 uppercase tracking-wide">Remaining Now</p>
            <p className={`text-base font-semibold ${fyProjection.totals.remainingNow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCost(fyProjection.totals.remainingNow)}
            </p>
          </div>
          <div className="border border-gray-200 rounded p-3">
            <p className="text-gray-500 uppercase tracking-wide">Run Out Date</p>
            <p className={`text-base font-semibold ${fyProjection.totals.runOutMonthKey ? 'text-red-600' : 'text-emerald-700'}`}>
              {fyProjection.totals.runOutMonthKey ? formatMonthLabel(fyProjection.totals.runOutMonthKey) : 'Within FY Budget'}
            </p>
          </div>
        </div>
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

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-700">FY Burn Projection By Deliverable</h2>
        </div>

        {fyProjection.byDeliverable.length === 0 ? (
          <p className="text-sm text-gray-500">No deliverables to calculate.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Deliverable</th>
                  <th className="px-3 py-2 text-left">Initial Funding (FY Start)</th>
                  <th className="px-3 py-2 text-left">Actual Spent To Date</th>
                  <th className="px-3 py-2 text-left">Remaining Now</th>
                  <th className="px-3 py-2 text-left">Future Forecast (Rest of FY)</th>
                  <th className="px-3 py-2 text-left">Projected End FY Remaining</th>
                  <th className="px-3 py-2 text-left">Run Out Date</th>
                </tr>
              </thead>
              <tbody>
                {fyProjection.byDeliverable.map((row) => (
                  <tr key={row.deliverableId} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-gray-400 ml-1">{row.code ? `(${row.code})` : ''}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.initialFunding)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.actualSpendToDate)}</td>
                    <td className={`px-3 py-2 ${row.remainingNow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(row.remainingNow)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.futureForecastSpend)}</td>
                    <td className={`px-3 py-2 ${row.projectedEndOfYearRemaining >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(row.projectedEndOfYearRemaining)}
                    </td>
                    <td className={`px-3 py-2 ${row.runOutMonthKey ? 'text-red-600' : 'text-emerald-700'}`}>
                      {row.runOutMonthKey ? formatMonthLabel(row.runOutMonthKey) : 'Within FY Budget'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold text-gray-700">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{formatCost(fyProjection.totals.initialFunding)}</td>
                  <td className="px-3 py-2">{formatCost(fyProjection.totals.actualSpendToDate)}</td>
                  <td className={`px-3 py-2 ${fyProjection.totals.remainingNow >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCost(fyProjection.totals.remainingNow)}
                  </td>
                  <td className="px-3 py-2">{formatCost(fyProjection.totals.futureForecastSpend)}</td>
                  <td className={`px-3 py-2 ${fyProjection.totals.projectedEndOfYearRemaining >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCost(fyProjection.totals.projectedEndOfYearRemaining)}
                  </td>
                  <td className={`px-3 py-2 ${fyProjection.totals.runOutMonthKey ? 'text-red-600' : 'text-emerald-700'}`}>
                    {fyProjection.totals.runOutMonthKey ? formatMonthLabel(fyProjection.totals.runOutMonthKey) : 'Within FY Budget'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-gray-700 mb-3">Future Month Forecast Tallies</h2>
        {fyProjection.futureMonthTallies.length === 0 ? (
          <p className="text-sm text-gray-500">No future months remain in the current financial year.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Forecast Spend</th>
                  <th className="px-3 py-2 text-left">Cumulative Future Forecast</th>
                  <th className="px-3 py-2 text-left">Projected Remaining After Month</th>
                </tr>
              </thead>
              <tbody>
                {fyProjection.futureMonthTallies.map((row) => (
                  <tr key={row.monthKey} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-700">{row.label}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.forecastSpend)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatCost(row.cumulativeForecastSpend)}</td>
                    <td className={`px-3 py-2 ${row.projectedRemainingAfterMonth >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(row.projectedRemainingAfterMonth)}
                    </td>
                  </tr>
                ))}
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

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
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
