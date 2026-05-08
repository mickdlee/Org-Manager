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

export const DEFAULT_SQUAD_ROLES = ['Squad Member'] as const;

export interface RoleConfig {
  deliveryUnit: string[];
  releaseTrain: string[];
  squad: string[];
}

export interface Person {
  id: string;
  name: string;
  email: string;
}

export interface Assignment {
  personId: string;
  role: AnyRole;
}

// Onboarding types
export type OnboardingStage = 'Recruitment' | 'Pre-boarding' | 'Ramp-up';
export type SprintTaskStatus = 'To Do' | 'In Progress' | 'Done';
export type HiringPriority = 'Low' | 'Medium' | 'High';

export interface OnboardingCandidate {
  id: string;
  name: string;
  stage: OnboardingStage;
}

export interface OpenPosition {
  id: string;
  title: string;
  priority: HiringPriority;
}

export interface SprintTask {
  id: string;
  title: string;
  assigneePersonId?: string;
  status: SprintTaskStatus;
}

export interface SquadOnboarding {
  sprintName?: string;
  hiringPriority?: HiringPriority;
  pendingOffboarding?: number;
  avgRampUpDays?: number;
  candidates: OnboardingCandidate[];
  openPositions: OpenPosition[];
  sprintTasks: SprintTask[];
}

export interface DeliveryUnitOnboarding {
  overallHealthStatus?: 'Healthy' | 'Attention' | 'Critical';
  totalNewHires?: number;
  totalOpenRoles?: number;
  totalPendingOffboarding?: number;
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
}

export interface DeliveryUnit {
  id: string;
  name: string;
  description: string;
  assignments: Assignment[];
  releaseTrains: ReleaseTrain[];
  onboarding?: DeliveryUnitOnboarding;
}

export interface AppData {
  deliveryUnits: DeliveryUnit[];
  people: Person[];
  roleConfig: RoleConfig;
}

// Auth types
export type UserRole = 'admin' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  passwordHash: string; // SHA-256 hex
  role: UserRole;
}

export interface Session {
  userId: string;
  username: string;
  role: UserRole;
}
