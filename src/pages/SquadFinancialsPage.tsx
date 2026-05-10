import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Copy, Trash2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { canManageSquad } from '../utils/permissions';
import { formatMonthKey, getFinancialYearMonths, getSquadMonthlyAdjustmentAmount } from '../utils/financials';
import { assignmentsDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';
import type { DeliverableAllocationSet, SquadFinancialAdjustment } from '../types';

type AllocationKind = 'actual' | 'forecast';

export function SquadFinancialsPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, setSquadFinancialAllocation, addSquadFinancialAdjustment, deleteSquadFinancialAdjustment } = useAppStore();
  const { session } = useAuth();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  const canEditSquad = canManageSquad(data, session, du.id, rt.id, sq.id);
  const fundedDeliverables = du.fundedDeliverables ?? [];
  const fyMonths = getFinancialYearMonths(new Date());
  const currentYear = new Date().getFullYear();
  const currentMonthKey = formatMonthKey(new Date());
  const getPerson = (personId: string) => data.people.find((person) => person.id === personId);
  const defaultMonthKey = fyMonths.some((month) => month.key === currentMonthKey)
    ? currentMonthKey
    : fyMonths[0]?.key ?? currentMonthKey;

  const [financialMonth, setFinancialMonth] = useState(defaultMonthKey);
  const [financialAmount, setFinancialAmount] = useState('0');
  const [financialReason, setFinancialReason] = useState('');

  const [personMonth, setPersonMonth] = useState(defaultMonthKey);
  const [personId, setPersonId] = useState(sq.assignments[0]?.personId ?? '');
  const [daysReduced, setDaysReduced] = useState('1');
  const [personReason, setPersonReason] = useState('');
  const [personAdjustmentError, setPersonAdjustmentError] = useState('');

  const actualDailyCost = assignmentsDailyCost(sq.assignments, getPerson);
  const forecastDailyCost =
    actualDailyCost +
    (sq.onboarding?.openPositions ?? []).reduce((sum, pos) => {
      if (!pos.dayRate) return sum;
      const allocation = pos.allocationPercentage ?? 100;
      return sum + pos.dayRate * (allocation / 100);
    }, 0);

  const actualMonthlyCostBase = actualDailyCost * WORKING_DAYS_PER_MONTH;
  const forecastMonthlyCostBase = forecastDailyCost * WORKING_DAYS_PER_MONTH;

  const squadAdjustmentsByMonth = useMemo(
    () =>
      Object.fromEntries(
        fyMonths.map((month) => [month.key, du.financialsByMonth?.[month.key]?.squadAdjustments?.[sq.id] ?? []]),
      ) as Record<string, SquadFinancialAdjustment[]>,
    [fyMonths, du.financialsByMonth, sq.id],
  );

  const monthAdjustmentAmount = useMemo(
    () =>
      Object.fromEntries(
        fyMonths.map((month) => [
          month.key,
          getSquadMonthlyAdjustmentAmount(data, sq.assignments, squadAdjustmentsByMonth[month.key]),
        ]),
      ) as Record<string, number>,
    [data, fyMonths, sq.assignments, squadAdjustmentsByMonth],
  );

  const peopleInSquad = useMemo(
    () =>
      Array.from(new Set(sq.assignments.map((assignment) => assignment.personId)))
        .map((id) => getPerson(id))
        .filter((person): person is NonNullable<ReturnType<typeof getPerson>> => Boolean(person)),
    [sq.assignments, data.people],
  );

  const daysAvailableByPerson = useMemo(() => {
    const next: Record<string, number> = {};
    for (const assignment of sq.assignments) {
      const allocation = assignment.allocationPercentage ?? 100;
      next[assignment.personId] = (next[assignment.personId] ?? 0) + (WORKING_DAYS_PER_MONTH * allocation) / 100;
    }
    return next;
  }, [sq.assignments]);

  const existingPersonDaysReduced = useMemo(() => {
    return (squadAdjustmentsByMonth[personMonth] ?? []).reduce((sum, adjustment) => {
      if (adjustment.type !== 'person') return sum;
      if (adjustment.personId !== personId) return sum;
      return sum + adjustment.daysReduced;
    }, 0);
  }, [squadAdjustmentsByMonth, personMonth, personId]);

  const maxReducibleDays = Math.max(0, (daysAvailableByPerson[personId] ?? 0) - existingPersonDaysReduced);

  const adjustmentsList = useMemo(() => {
    const monthIndex = new Map(fyMonths.map((month, idx) => [month.key, idx]));
    const entries: Array<{
      monthKey: string;
      monthLabel: string;
      adjustment: SquadFinancialAdjustment;
      amount: number;
      description: string;
    }> = [];

    for (const month of fyMonths) {
      const monthAdjustments = squadAdjustmentsByMonth[month.key] ?? [];
      for (const adjustment of monthAdjustments) {
        if (adjustment.type === 'financial') {
          entries.push({
            monthKey: month.key,
            monthLabel: month.label,
            adjustment,
            amount: adjustment.amount,
            description: adjustment.reason,
          });
        } else {
          const person = getPerson(adjustment.personId);
          const personDaily = sq.assignments
            .filter((assignment) => assignment.personId === adjustment.personId)
            .reduce((sum, assignment) => {
              const alloc = assignment.allocationPercentage ?? 100;
              return sum + ((person?.dayRate ?? 0) * alloc) / 100;
            }, 0);
          const amount = -personDaily * adjustment.daysReduced;
          entries.push({
            monthKey: month.key,
            monthLabel: month.label,
            adjustment,
            amount,
            description: `${person?.name ?? 'Unknown'} · ${adjustment.daysReduced} day(s) reduced · ${adjustment.reason}`,
          });
        }
      }
    }

    return entries.sort((a, b) => {
      const monthCompare = (monthIndex.get(a.monthKey) ?? 999) - (monthIndex.get(b.monthKey) ?? 999);
      if (monthCompare !== 0) return monthCompare;
      return a.adjustment.id.localeCompare(b.adjustment.id);
    });
  }, [fyMonths, squadAdjustmentsByMonth, sq.assignments, data.people]);

  const updateCell = (monthKey: string, kind: AllocationKind, deliverableId: string, value: string) => {
    if (!canEditSquad) return;
    const numericValue = value.trim() === '' ? 0 : Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return;

    const current = du.financialsByMonth?.[monthKey]?.squadAllocations?.[sq.id]?.[kind] ?? {};
    setSquadFinancialAllocation(du.id, monthKey, sq.id, kind, {
      ...current,
      [deliverableId]: numericValue,
    });
  };

  const allocationKindForMonth = (monthKey: string): AllocationKind =>
    monthKey < currentMonthKey ? 'actual' : 'forecast';

  const replicateAllocationFromPreviousMonth = (monthKey: string) => {
    if (!canEditSquad) return;

    const monthIndex = fyMonths.findIndex((month) => month.key === monthKey);
    if (monthIndex <= 0) return;

    const targetKind = allocationKindForMonth(monthKey);
    if (targetKind === 'actual') return;

    const previousMonthKey = fyMonths[monthIndex - 1].key;
    const previousKind = allocationKindForMonth(previousMonthKey);
    const previousAllocation = du.financialsByMonth?.[previousMonthKey]?.squadAllocations?.[sq.id]?.[previousKind] ?? {};
    const nextAllocation: DeliverableAllocationSet = Object.fromEntries(
      fundedDeliverables.map((deliverable) => [deliverable.id, previousAllocation[deliverable.id] ?? 0]),
    );

    setSquadFinancialAllocation(du.id, monthKey, sq.id, targetKind, nextAllocation);
  };

  const blendedTotals = Object.fromEntries(
    fyMonths.map((month) => {
      const kind = allocationKindForMonth(month.key);
      const allocation = du.financialsByMonth?.[month.key]?.squadAllocations?.[sq.id]?.[kind] ?? {};
      const total = fundedDeliverables.reduce((sum, deliverable) => sum + (allocation[deliverable.id] ?? 0), 0);
      return [month.key, total];
    }),
  ) as Record<string, number>;

  return (
    <Layout
      title={`${sq.name} Financials`}
      breadcrumbs={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: du.name, to: `/delivery-units/${du.id}` },
        { label: rt.name, to: `/release-trains/${du.id}/${rt.id}` },
        { label: sq.name, to: `/squads/${du.id}/${rt.id}/${sq.id}` },
        { label: 'Financials' },
      ]}
    >
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          to={`/squads/${du.id}/${rt.id}/${sq.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Members
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Financials
        </span>
        {canEditSquad && (
          <>
            <Link
              to={`/squads/${du.id}/${rt.id}/${sq.id}/editor`}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Editor
            </Link>
            <Link
              to={`/squads/${du.id}/${rt.id}/${sq.id}/onboarding`}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              Onboarding
            </Link>
          </>
        )}
      </div>

      {fundedDeliverables.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500">No funded deliverables configured for this Delivery Unit.</p>
        </Card>
      ) : (
        <AllocationGrid
          title="Allocation %"
          fyMonths={fyMonths}
          fundedDeliverables={fundedDeliverables}
          canEdit={canEditSquad}
          currentYear={currentYear}
          currentMonthKey={currentMonthKey}
          getAllocationKindForMonth={allocationKindForMonth}
          getMonthlyCostBase={(monthKey) =>
            (allocationKindForMonth(monthKey) === 'actual' ? actualMonthlyCostBase : forecastMonthlyCostBase)
            + (monthAdjustmentAmount[monthKey] ?? 0)
          }
          getValue={(monthKey, deliverableId) => {
            const kind = allocationKindForMonth(monthKey);
            return du.financialsByMonth?.[monthKey]?.squadAllocations?.[sq.id]?.[kind]?.[deliverableId] ?? 0;
          }}
          totals={blendedTotals}
          onReplicatePreviousMonth={replicateAllocationFromPreviousMonth}
          onChange={(monthKey, deliverableId, value) => {
            const kind = allocationKindForMonth(monthKey);
            if (kind === 'actual') return;
            updateCell(monthKey, kind, deliverableId, value);
          }}
        />
      )}

      <Card>
        <h2 className="font-semibold text-gray-700 mb-3">Squad Adjustments</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Financial Adjustment</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <Select
                label="Month"
                value={financialMonth}
                onChange={(e) => setFinancialMonth(e.target.value)}
                options={fyMonths.map((month) => ({ label: month.label, value: month.key }))}
              />
              <Input
                label="Amount"
                type="number"
                value={financialAmount}
                onChange={(e) => setFinancialAmount(e.target.value)}
              />
              <Input
                label="Reason"
                value={financialReason}
                onChange={(e) => setFinancialReason(e.target.value)}
                placeholder="e.g. Vendor credit"
              />
            </div>
            <Button
              size="sm"
              disabled={!canEditSquad}
              onClick={() => {
                const amount = Number(financialAmount);
                if (!Number.isFinite(amount)) return;
                if (!financialReason.trim()) return;
                addSquadFinancialAdjustment(du.id, financialMonth, sq.id, {
                  type: 'financial',
                  amount,
                  reason: financialReason.trim(),
                });
                setFinancialAmount('0');
                setFinancialReason('');
              }}
            >
              Add Financial Adjustment
            </Button>
          </div>

          <div className="border border-gray-200 rounded p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Person Adjustment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <Select
                label="Month"
                value={personMonth}
                onChange={(e) => {
                  setPersonMonth(e.target.value);
                  setPersonAdjustmentError('');
                }}
                options={fyMonths.map((month) => ({ label: month.label, value: month.key }))}
              />
              <Select
                label="Squad Person"
                value={personId}
                onChange={(e) => {
                  setPersonId(e.target.value);
                  setPersonAdjustmentError('');
                }}
                options={[
                  { label: peopleInSquad.length > 0 ? 'Select person' : 'No assigned squad members', value: '' },
                  ...peopleInSquad.map((person) => ({ label: person.name, value: person.id })),
                ]}
              />
              <Input
                label={`Days Reduced (max ${Math.floor(maxReducibleDays)})`}
                type="number"
                min={0}
                max={Math.floor(maxReducibleDays)}
                step={1}
                value={daysReduced}
                onChange={(e) => {
                  setDaysReduced(e.target.value);
                  setPersonAdjustmentError('');
                }}
              />
              <Input
                label="Reason"
                value={personReason}
                onChange={(e) => {
                  setPersonReason(e.target.value);
                  setPersonAdjustmentError('');
                }}
                placeholder="e.g. Leave"
              />
            </div>
            {personAdjustmentError && <p className="text-xs text-red-600 mb-2">{personAdjustmentError}</p>}
            <Button
              size="sm"
              disabled={!canEditSquad || !personId}
              onClick={() => {
                const days = Number(daysReduced);
                if (!personId) {
                  setPersonAdjustmentError('Select a person.');
                  return;
                }
                if (!Number.isFinite(days) || days <= 0) {
                  setPersonAdjustmentError('Days reduced must be greater than 0.');
                  return;
                }
                if (days > maxReducibleDays + 0.0001) {
                  setPersonAdjustmentError(`Days reduced exceeds available days (${Math.floor(maxReducibleDays)}).`);
                  return;
                }
                if (!personReason.trim()) {
                  setPersonAdjustmentError('Reason is required.');
                  return;
                }

                addSquadFinancialAdjustment(du.id, personMonth, sq.id, {
                  type: 'person',
                  personId,
                  daysReduced: Math.floor(days),
                  reason: personReason.trim(),
                });
                setDaysReduced('1');
                setPersonReason('');
              }}
            >
              Add Person Adjustment
            </Button>
          </div>
        </div>

        {adjustmentsList.length === 0 ? (
          <p className="text-sm text-gray-500">No adjustments added yet.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Detail</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  {canEditSquad && <th className="px-3 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {adjustmentsList.map((entry) => (
                  <tr key={entry.adjustment.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-700">{entry.monthLabel}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{entry.adjustment.type}</td>
                    <td className="px-3 py-2 text-gray-700">{entry.description}</td>
                    <td className={`px-3 py-2 font-semibold ${entry.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCost(entry.amount)}
                    </td>
                    {canEditSquad && (
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteSquadFinancialAdjustment(du.id, entry.monthKey, sq.id, entry.adjustment.id)}
                          className="text-gray-300 hover:text-red-500 p-1"
                          title="Delete adjustment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}

function AllocationGrid({
  title,
  fyMonths,
  fundedDeliverables,
  canEdit,
  currentYear,
  currentMonthKey,
  getAllocationKindForMonth,
  getMonthlyCostBase,
  getValue,
  totals,
  onReplicatePreviousMonth,
  onChange,
}: {
  title: string;
  fyMonths: Array<{ key: string; label: string }>;
  fundedDeliverables: Array<{ id: string; name: string; code: string }>;
  canEdit: boolean;
  currentYear: number;
  currentMonthKey: string;
  getAllocationKindForMonth: (monthKey: string) => AllocationKind;
  getMonthlyCostBase: (monthKey: string) => number;
  getValue: (monthKey: string, deliverableId: string) => number;
  totals: Record<string, number>;
  onReplicatePreviousMonth: (monthKey: string) => void;
  onChange: (monthKey: string, deliverableId: string, value: string) => void;
}) {
  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">Current Year: {currentYear} · Financial Year: Oct - Sep (monthly total should be 0% or 100%)</span>
      </div>
      <div className="mb-3 text-xs text-gray-500">
        Months before {currentMonthKey} use Actuals. {currentMonthKey} and later use Forecast.
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-xs min-w-[920px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Deliverable</th>
              {fyMonths.map((month, idx) => {
                const kind = getAllocationKindForMonth(month.key);
                const canReplicate = canEdit && kind === 'forecast' && idx > 0;
                return (
                  <th key={month.key} className="px-2 py-2 text-left">
                    <div>{month.label}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <div className={`text-[10px] normal-case ${kind === 'actual' ? 'text-emerald-700' : 'text-blue-700'}`}>
                        {kind === 'actual' ? 'Actual' : 'Forecast'}
                      </div>
                      {kind === 'forecast' && (
                        <button
                          type="button"
                          disabled={!canReplicate}
                          onClick={() => onReplicatePreviousMonth(month.key)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 px-1 py-0.5 text-[10px] normal-case text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Copy allocation from previous month"
                        >
                          <Copy size={10} />
                          Copy prev
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fundedDeliverables.map((deliverable) => (
              <tr key={deliverable.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-700 min-w-56">
                  <span className="font-medium">{deliverable.name}</span>
                  <span className="text-gray-400 ml-1">{deliverable.code ? `(${deliverable.code})` : ''}</span>
                </td>
                {fyMonths.map((month) => (
                  <td key={`${deliverable.id}-${month.key}`} className="px-2 py-2">
                    {(() => {
                      const kind = getAllocationKindForMonth(month.key);
                      const isEditable = canEdit && kind === 'forecast';
                      const percent = getValue(month.key, deliverable.id);
                      const monthlyCostBase = getMonthlyCostBase(month.key);
                      const monthlyCost = (monthlyCostBase * percent) / 100;

                      return (
                        <>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={percent}
                      disabled={!isEditable}
                      onChange={(e) => onChange(month.key, deliverable.id, e.target.value)}
                      className={`w-18 border rounded px-2 py-1 text-xs focus:outline-none ${
                        isEditable
                          ? 'border-gray-200 focus:border-blue-500'
                          : 'border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed'
                      }`}
                    />
                          <div className="text-[10px] text-gray-500 mt-1">{formatCost(monthlyCost)}</div>
                        </>
                      );
                    })()}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="px-3 py-2 font-semibold text-gray-700">Total %</td>
              {fyMonths.map((month) => {
                const total = totals[month.key] ?? 0;
                const valid = Math.abs(total - 100) < 0.0001 || Math.abs(total) < 0.0001;
                return (
                  <td key={`total-${month.key}`} className={`px-2 py-2 font-semibold ${valid ? 'text-emerald-700' : 'text-red-600'}`}>
                    {total}%
                  </td>
                );
              })}
            </tr>
            <tr className="bg-gray-50/70 border-t border-gray-200">
              <td className="px-3 py-2 font-semibold text-gray-700">Auto Cost /month</td>
              {fyMonths.map((month) => {
                const totalPercent = totals[month.key] ?? 0;
                const monthlyCostBase = getMonthlyCostBase(month.key);
                const monthlyCost = (monthlyCostBase * totalPercent) / 100;
                return (
                  <td key={`cost-${month.key}`} className="px-2 py-2 font-semibold text-gray-700">
                    {formatCost(monthlyCost)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
