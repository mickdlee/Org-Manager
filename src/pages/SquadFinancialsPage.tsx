import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import { canManageSquad } from '../utils/permissions';
import { getFinancialYearMonths } from '../utils/financials';
import { assignmentsDailyCost, formatCost, WORKING_DAYS_PER_MONTH } from '../utils/cost';

type AllocationKind = 'actual' | 'forecast';

export function SquadFinancialsPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, setSquadFinancialAllocation } = useAppStore();
  const { session } = useAuth();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  const canEditSquad = canManageSquad(data, session, du.id, rt.id, sq.id);
  const fundedDeliverables = du.fundedDeliverables ?? [];
  const fyMonths = getFinancialYearMonths(new Date());
  const currentYear = new Date().getFullYear();
  const getPerson = (personId: string) => data.people.find((person) => person.id === personId);

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

  const monthTotals = (kind: AllocationKind) =>
    Object.fromEntries(
      fyMonths.map((month) => {
        const allocation = du.financialsByMonth?.[month.key]?.squadAllocations?.[sq.id]?.[kind] ?? {};
        const total = fundedDeliverables.reduce((sum, deliverable) => sum + (allocation[deliverable.id] ?? 0), 0);
        return [month.key, total];
      }),
    ) as Record<string, number>;

  const actualTotals = monthTotals('actual');
  const forecastTotals = monthTotals('forecast');

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
        <>
          <AllocationGrid
            title="Actual Allocation %"
            kind="actual"
            fyMonths={fyMonths}
            fundedDeliverables={fundedDeliverables}
            canEdit={canEditSquad}
            currentYear={currentYear}
            monthlyCostBase={actualMonthlyCostBase}
            getValue={(monthKey, deliverableId) =>
              du.financialsByMonth?.[monthKey]?.squadAllocations?.[sq.id]?.actual?.[deliverableId] ?? 0
            }
            totals={actualTotals}
            onChange={updateCell}
          />
          <AllocationGrid
            title="Forecast Allocation %"
            kind="forecast"
            fyMonths={fyMonths}
            fundedDeliverables={fundedDeliverables}
            canEdit={canEditSquad}
            currentYear={currentYear}
            monthlyCostBase={forecastMonthlyCostBase}
            getValue={(monthKey, deliverableId) =>
              du.financialsByMonth?.[monthKey]?.squadAllocations?.[sq.id]?.forecast?.[deliverableId] ?? 0
            }
            totals={forecastTotals}
            onChange={updateCell}
          />
        </>
      )}
    </Layout>
  );
}

function AllocationGrid({
  title,
  kind,
  fyMonths,
  fundedDeliverables,
  canEdit,
  currentYear,
  monthlyCostBase,
  getValue,
  totals,
  onChange,
}: {
  title: string;
  kind: AllocationKind;
  fyMonths: Array<{ key: string; label: string }>;
  fundedDeliverables: Array<{ id: string; name: string; code: string }>;
  canEdit: boolean;
  currentYear: number;
  monthlyCostBase: number;
  getValue: (monthKey: string, deliverableId: string) => number;
  totals: Record<string, number>;
  onChange: (monthKey: string, kind: AllocationKind, deliverableId: string, value: string) => void;
}) {
  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">Current Year: {currentYear} · Financial Year: Oct - Sep (monthly total should be 0% or 100%)</span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-xs min-w-[920px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Deliverable</th>
              {fyMonths.map((month) => (
                <th key={month.key} className="px-2 py-2 text-left">{month.label}</th>
              ))}
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
                      const percent = getValue(month.key, deliverable.id);
                      const monthlyCost = (monthlyCostBase * percent) / 100;

                      return (
                        <>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={percent}
                      disabled={!canEdit}
                      onChange={(e) => onChange(month.key, kind, deliverable.id, e.target.value)}
                      className="w-18 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
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
