// Entity types

export type AnyRole = string;

export const DEFAULT_DELIVERY_UNIT_ROLES = [
  'Delivery Unit Owner',
  'Chief Product Owner',
  'Delivery Lead',
] as const;

export const DEFAULT_RELEASE_TRAIN_ROLES = [
  'Release Train Engineer',
  'Product Owner',
] as const;

export const DEFAULT_SQUAD_ROLES = [
  'Product Owner',
  'Scrum Master',
  'Developer',
  'Business Analyst',
  'Quality Assurance',
  'Change Manager',
  'Subject Matter Expert',
  'Designer',
  'Architect',
] as const;

export type DeliveryUnitType = 'Customer Journey' | 'Platform' | 'Supporting';

export const DELIVERY_UNIT_TYPES: DeliveryUnitType[] = [
  'Customer Journey',
  'Platform',
  'Supporting',
];

export interface RoleConfig {
  deliveryUnit: string[];
  releaseTrain: string[];
  squad: string[];
}

export interface Person {
  id: string;
  name: string;
  email: string;
  salaryId?: string;
  typicalRole?: string;
  capabilityNotes?: string;
  photoUrl?: string;
  dayRate?: number;
}

export interface Assignment {
  personId: string;
  role: AnyRole;
  allocationPercentage?: number;
  isScheduledOffboarding?: boolean;
  offboardingDate?: string;
}

// Onboarding types
export type OnboardingStage = 'Recruitment' | 'Pre-boarding' | 'Ramp-up';
export type HiringPriority = 'Low' | 'Medium' | 'High';

export interface OnboardingCandidate {
  id: string;
  name: string;
  stage: OnboardingStage;
  onboardingDate?: string;
}

export interface OpenPosition {
  id: string;
  title: string;
  priority: HiringPriority;
  allocationPercentage?: number;
  dayRate?: number;
}

export type DeliverableStatus = 'Planned' | 'In Progress' | 'At Risk' | 'Complete';

export interface FundedDeliverable {
  id: string;
  code: string;
  name: string;
  owner: string;
  status: DeliverableStatus;
  startDate?: string;
  endDate?: string;
  fundingAmount: number;
}

export type DeliverableAllocationSet = Record<string, number>;

export interface SquadMonthFinancialAllocation {
  actual: DeliverableAllocationSet;
  forecast: DeliverableAllocationSet;
}

export interface FinancialAmountAdjustment {
  id: string;
  type: 'financial';
  amount: number;
  reason: string;
}

export interface PersonDaysAdjustment {
  id: string;
  type: 'person';
  personId: string;
  daysReduced: number;
  reason: string;
}

export type SquadFinancialAdjustment = FinancialAmountAdjustment | PersonDaysAdjustment;

export type NewSquadFinancialAdjustment =
  | Omit<FinancialAmountAdjustment, 'id'>
  | Omit<PersonDaysAdjustment, 'id'>;

export interface FinancialMonthRecord {
  squadAllocations: Record<string, SquadMonthFinancialAllocation>;
  squadAdjustments?: Record<string, SquadFinancialAdjustment[]>;
}

export interface SquadOnboarding {
  hiringPriority?: HiringPriority;
  pendingOffboarding?: number;
  avgRampUpDays?: number;
  candidates: OnboardingCandidate[];
  openPositions: OpenPosition[];
}

export interface DeliveryUnitOnboarding {
  overallHealthStatus?: 'Healthy' | 'Attention' | 'Critical';
  totalNewHires?: number;
  totalOpenRoles?: number;
  totalPendingOffboarding?: number;
}

export interface KeyResultYearlyTarget {
  year: number;
  target: string;
}

export interface DeliveryUnitKeyResult {
  id: string;
  title: string;
  baseline?: string;
  notes?: string;
  yearlyTargets: KeyResultYearlyTarget[];
}

export interface DeliveryUnitOKR {
  id: string;
  objective: string;
  keyResults: DeliveryUnitKeyResult[];
  progress?: number;
  targetDate?: string;
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  assignments: Assignment[];
  onboarding?: SquadOnboarding;
}

export interface ReleaseTrain {
  id: string;
  name: string;
  description: string;
  assignments: Assignment[];
  squads: Squad[];
  openPositions?: OpenPosition[];
}

export interface DeliveryUnit {
  id: string;
  name: string;
  type: DeliveryUnitType;
  description: string;
  assignments: Assignment[];
  releaseTrains: ReleaseTrain[];
  onboarding?: DeliveryUnitOnboarding;
  okrs?: DeliveryUnitOKR[];
  openPositions?: OpenPosition[];
  fundedDeliverables?: FundedDeliverable[];
  financialsByMonth?: Record<string, FinancialMonthRecord>;
}

export interface SquadTemplateRole {
  role: string;
  count: number;
}

export interface SquadTemplate {
  id: string;
  name: string;
  roles: SquadTemplateRole[];
}

export interface UISettings {
  showFinancials: boolean;
}

export interface AppData {
  deliveryUnits: DeliveryUnit[];
  people: Person[];
  roleConfig: RoleConfig;
  squadTemplates: SquadTemplate[];
  uiSettings: UISettings;
}

// Auth types
export type UserRole = 'admin' | 'orgManager' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string; // SHA-256 hex
  role: UserRole;
  salaryId?: string;
}

export interface Session {
  userId: string;
  username: string;
  role: UserRole;
  salaryId?: string;
}
