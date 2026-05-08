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

export interface Squad {
  id: string;
  name: string;
  description: string;
  assignments: Assignment[];
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
