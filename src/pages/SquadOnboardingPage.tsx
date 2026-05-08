import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import {
  Users, UserMinus, Zap, Briefcase,
  ArrowRight, Plus, Trash2, CheckCircle2, Circle, Clock,
  Building2, Train, ChevronRight, Flag, Users2,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Modal';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../hooks/useAuth';
import type {
  SquadOnboarding, OnboardingCandidate, OnboardingStage,
  OpenPosition, HiringPriority, SprintTask, SprintTaskStatus,
} from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const STAGES: OnboardingStage[] = ['Recruitment', 'Pre-boarding', 'Ramp-up'];

const STAGE_META: Record<OnboardingStage, { label: string; sublabel: string; color: string; bg: string }> = {
  'Recruitment':  { label: 'Recruitment',  sublabel: 'Candidates in screening', color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200' },
  'Pre-boarding': { label: 'Pre-boarding', sublabel: 'Offer accepted',          color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200' },
  'Ramp-up':      { label: 'Ramp-up',      sublabel: 'Members in training',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
};

const PRIORITY_COLORS: Record<HiringPriority, 'amber' | 'blue' | 'gray'> = {
  High: 'amber', Medium: 'blue', Low: 'gray',
};

const STATUS_META: Record<SprintTaskStatus, { icon: React.ReactNode; color: string; label: string }> = {
  'To Do':      { icon: <Circle size={13} />,       color: 'text-gray-400',   label: 'To Do' },
  'In Progress':{ icon: <Clock size={13} />,        color: 'text-blue-500',   label: 'In Progress' },
  'Done':       { icon: <CheckCircle2 size={13} />, color: 'text-emerald-500', label: 'Done' },
};

function emptyOnboarding(): SquadOnboarding {
  return {
    sprintName: 'S-1',
    hiringPriority: 'Medium',
    pendingOffboarding: 0,
    avgRampUpDays: 14,
    candidates: [],
    openPositions: [],
    sprintTasks: [],
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SquadOnboardingPage() {
  const { duId, rtId, sqId } = useParams<{ duId: string; rtId: string; sqId: string }>();
  const { data, updateSquadOnboarding } = useAppStore();
  const { isAdmin } = useAuth();

  const du = data.deliveryUnits.find((d) => d.id === duId);
  const rt = du?.releaseTrains.find((r) => r.id === rtId);
  const sq = rt?.squads.find((s) => s.id === sqId);

  if (!du || !rt || !sq) return <Navigate to="/dashboard" replace />;

  const ob: SquadOnboarding = sq.onboarding ?? emptyOnboarding();

  const save = (next: SquadOnboarding) => updateSquadOnboarding(du.id, rt.id, sq.id, next);

  const totalInPipeline = ob.candidates.length;

  return (
    <Layout
      title={sq.name}
      breadcrumbs={[
        { label: 'Dashboard',   to: '/dashboard' },
        { label: du.name,       to: `/delivery-units/${du.id}` },
        { label: rt.name,       to: `/release-trains/${du.id}/${rt.id}` },
        { label: sq.name,       to: `/squads/${du.id}/${rt.id}/${sq.id}` },
        { label: 'Onboarding' },
      ]}
    >
      {/* Sub-nav tab strip */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          to={`/squads/${du.id}/${rt.id}/${sq.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          Members
        </Link>
        <span className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
          Onboarding
        </span>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users size={16} />}    label="Members"            value={sq.assignments.length}            color="text-blue-600" />
        <StatCard icon={<UserMinus size={16} />} label="Pending Offboarding" value={ob.pendingOffboarding ?? 0}       color="text-amber-600" />
        <StatCard icon={<Zap size={16} />}       label="Avg Ramp-up"        value={`${ob.avgRampUpDays ?? 0}d`}      color="text-emerald-600" sub="Average" />
        <StatCard icon={<Briefcase size={16} />} label="Open Positions"     value={ob.openPositions.length}          color="text-indigo-600" sub="Active" />
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Onboarding Pipeline */}
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Onboarding Pipeline</h2>
                <p className="text-xs text-gray-400 mt-0.5">{totalInPipeline} total in pipeline</p>
              </div>
              {isAdmin && (
                <AddCandidateButton
                  onAdd={(c) => save({ ...ob, candidates: [...ob.candidates, c] })}
                />
              )}
            </div>

            {/* Stage flow */}
            <div className="flex gap-2 items-stretch">
              {STAGES.map((stage, i) => {
                const meta = STAGE_META[stage];
                const items = ob.candidates.filter((c) => c.stage === stage);
                return (
                  <div key={stage} className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`flex-1 border rounded-lg p-3 ${meta.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <span className={`text-lg font-bold ${meta.color}`}>{items.length}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{meta.sublabel}</p>
                      <div className="space-y-1">
                        {items.map((c) => (
                          <CandidateRow
                            key={c.id}
                            candidate={c}
                            isAdmin={isAdmin}
                            onChangeStage={(newStage) =>
                              save({ ...ob, candidates: ob.candidates.map((x) => x.id === c.id ? { ...x, stage: newStage } : x) })
                            }
                            onRemove={() =>
                              save({ ...ob, candidates: ob.candidates.filter((x) => x.id !== c.id) })
                            }
                          />
                        ))}
                        {items.length === 0 && (
                          <p className="text-xs text-gray-400 italic py-1">None</p>
                        )}
                      </div>
                    </div>
                    {i < STAGES.length - 1 && (
                      <ArrowRight size={14} className="text-gray-300 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Current Sprint */}
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                  Current Sprint {ob.sprintName ? `(${ob.sprintName})` : ''}
                </h2>
              </div>
              {isAdmin && (
                <AddTaskButton
                  people={data.people}
                  onAdd={(t) => save({ ...ob, sprintTasks: [...ob.sprintTasks, t] })}
                />
              )}
            </div>

            {ob.sprintTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No sprint tasks yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {ob.sprintTasks.map((task) => {
                  const person = task.assigneePersonId ? data.people.find((p) => p.id === task.assigneePersonId) : null;
                  const sm = STATUS_META[task.status];
                  return (
                    <div key={task.id} className="flex items-center gap-3 py-3">
                      {/* Status toggle */}
                      <button
                        disabled={!isAdmin}
                        onClick={() => {
                          const cycle: SprintTaskStatus[] = ['To Do', 'In Progress', 'Done'];
                          const next = cycle[(cycle.indexOf(task.status) + 1) % cycle.length];
                          save({ ...ob, sprintTasks: ob.sprintTasks.map((t) => t.id === task.id ? { ...t, status: next } : t) });
                        }}
                        className={`shrink-0 ${sm.color} ${isAdmin ? 'hover:opacity-70 cursor-pointer' : 'cursor-default'}`}
                        title={isAdmin ? 'Click to advance status' : task.status}
                      >
                        {sm.icon}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {task.title}
                        </p>
                        {person && (
                          <p className="text-xs text-gray-400 truncate">Assigned to: {person.name}</p>
                        )}
                      </div>

                      <Badge color={task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : 'gray'}>
                        {sm.label}
                      </Badge>

                      {isAdmin && (
                        <button
                          onClick={() => save({ ...ob, sprintTasks: ob.sprintTasks.filter((t) => t.id !== task.id) })}
                          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          title="Remove task"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 space-y-4">

          {/* Unit Context */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Unit Context</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Users2 size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Squad Lead</p>
                  {(() => {
                    const lead = sq.assignments.find((a) =>
                      a.role.toLowerCase().includes('lead') || a.role.toLowerCase().includes('owner')
                    );
                    const person = lead ? data.people.find((p) => p.id === lead.personId) : null;
                    return person
                      ? <p className="font-medium text-gray-800">{person.name}</p>
                      : <p className="text-gray-400 italic text-xs">Not assigned</p>;
                  })()}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Flag size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-1">Hiring Priority</p>
                  {isAdmin ? (
                    <select
                      value={ob.hiringPriority ?? 'Medium'}
                      onChange={(e) => save({ ...ob, hiringPriority: e.target.value as HiringPriority })}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  ) : (
                    <Badge color={PRIORITY_COLORS[ob.hiringPriority ?? 'Medium']}>
                      {ob.hiringPriority ?? 'Medium'} Priority
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Delivery Unit</p>
                  <Link to={`/delivery-units/${du.id}`} className="font-medium text-blue-600 hover:underline text-sm">{du.name}</Link>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Train size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Release Train</p>
                  <Link to={`/release-trains/${du.id}/${rt.id}`} className="font-medium text-blue-600 hover:underline text-sm">{rt.name}</Link>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Open Positions</h3>
              {isAdmin && (
                <AddPositionButton
                  onAdd={(p) => save({ ...ob, openPositions: [...ob.openPositions, p] })}
                />
              )}
            </div>
            {ob.openPositions.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No open positions.</p>
            ) : (
              <div className="space-y-2">
                {ob.openPositions.map((pos) => (
                  <div key={pos.id} className="flex items-start gap-2 group">
                    <ChevronRight size={11} className="text-gray-300 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-tight">{pos.title}</p>
                      <Badge color={PRIORITY_COLORS[pos.priority]}>{pos.priority}</Badge>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => save({ ...ob, openPositions: ob.openPositions.filter((p) => p.id !== pos.id) })}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sprint settings (admin) */}
          {isAdmin && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Sprint Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Sprint Name</label>
                  <input
                    type="text"
                    value={ob.sprintName ?? ''}
                    onChange={(e) => save({ ...ob, sprintName: e.target.value })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                    placeholder="e.g. S-42"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avg Ramp-up (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={ob.avgRampUpDays ?? ''}
                    onChange={(e) => save({ ...ob, avgRampUpDays: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pending Offboarding</label>
                  <input
                    type="number"
                    min={0}
                    value={ob.pendingOffboarding ?? ''}
                    onChange={(e) => save({ ...ob, pendingOffboarding: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
      <span className={`mt-0.5 shrink-0 ${color}`}>{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function CandidateRow({ candidate, isAdmin, onChangeStage, onRemove }: {
  candidate: OnboardingCandidate;
  isAdmin: boolean;
  onChangeStage: (s: OnboardingStage) => void;
  onRemove: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-center gap-1.5 group text-xs">
      <span className="flex-1 truncate text-gray-700 font-medium">{candidate.name}</span>
      {isAdmin && (
        <>
          <select
            value={candidate.stage}
            onChange={(e) => onChangeStage(e.target.value as OnboardingStage)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border-0 bg-transparent text-gray-400 cursor-pointer focus:outline-none"
          >
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setConfirm(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
          >
            <Trash2 size={11} />
          </button>
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title="Remove Candidate"
          message={`Remove ${candidate.name} from the pipeline?`}
          confirmLabel="Remove"
          onConfirm={() => { onRemove(); setConfirm(false); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

function AddCandidateButton({ onAdd }: { onAdd: (c: OnboardingCandidate) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [stage, setStage] = useState<OnboardingStage>('Recruitment');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!name.trim()) { setErr('Name is required.'); return; }
    onAdd({ id: uid(), name: name.trim(), stage });
    setName(''); setStage('Recruitment'); setErr(''); setOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={13} /> Add Candidate
      </Button>
      {open && (
        <Modal title="Add Candidate" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pipeline Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OnboardingStage)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={submit}>Add</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AddTaskButton({ people, onAdd }: {
  people: { id: string; name: string }[];
  onAdd: (t: SprintTask) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<SprintTaskStatus>('To Do');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!title.trim()) { setErr('Title is required.'); return; }
    onAdd({ id: uid(), title: title.trim(), assigneePersonId: assigneeId || undefined, status });
    setTitle(''); setAssigneeId(''); setStatus('To Do'); setErr(''); setOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={13} /> Add Task
      </Button>
      {open && (
        <Modal title="Add Sprint Task" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Task description"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assignee (optional)</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">— Unassigned —</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SprintTaskStatus)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={submit}>Add Task</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AddPositionButton({ onAdd }: { onAdd: (p: OpenPosition) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<HiringPriority>('Medium');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!title.trim()) { setErr('Title is required.'); return; }
    onAdd({ id: uid(), title: title.trim(), priority });
    setTitle(''); setPriority('Medium'); setErr(''); setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-gray-400 hover:text-blue-600 transition-colors"
        title="Add position"
      >
        <Plus size={14} />
      </button>
      {open && (
        <Modal title="Add Open Position" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Role Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErr(''); }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Senior Engineer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hiring Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as HiringPriority)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" onClick={submit}>Add Position</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
