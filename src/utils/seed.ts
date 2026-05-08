import type { AppData } from '../types';
import { DEFAULT_DELIVERY_UNIT_ROLES, DEFAULT_RELEASE_TRAIN_ROLES, DEFAULT_SQUAD_ROLES } from '../types';

export function generateSeedData(): AppData {
  // ── People ──────────────────────────────────────────────────────────────────
  // ── People (with day rates in USD and allocation % per person) ─────────────
  const people = [
    { id: 'p01', name: 'Sarah Mitchell',   email: 'sarah.mitchell@example.com', photoUrl: 'https://i.pravatar.cc/160?img=1', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p02', name: 'James Okafor',     email: 'james.okafor@example.com', photoUrl: 'https://i.pravatar.cc/160?img=2', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p03', name: 'Priya Nair',       email: 'priya.nair@example.com', photoUrl: 'https://i.pravatar.cc/160?img=3', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p04', name: 'Tom Bergström',    email: 'tom.bergstrom@example.com', photoUrl: 'https://i.pravatar.cc/160?img=4', dayRate: 1200, allocationPercentage: 80 },
    { id: 'p05', name: 'Amelia Rossi',     email: 'amelia.rossi@example.com', photoUrl: 'https://i.pravatar.cc/160?img=5', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p06', name: 'Chen Wei',         email: 'chen.wei@example.com', photoUrl: 'https://i.pravatar.cc/160?img=6', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p07', name: 'Marcus Johansson', email: 'marcus.johansson@example.com', photoUrl: 'https://i.pravatar.cc/160?img=7', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p08', name: 'Fatima Al-Hassan', email: 'fatima.alhassan@example.com', photoUrl: 'https://i.pravatar.cc/160?img=8', dayRate: 1200, allocationPercentage: 60 },
    { id: 'p09', name: 'Liam Fitzgerald',  email: 'liam.fitzgerald@example.com', photoUrl: 'https://i.pravatar.cc/160?img=9', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p10', name: 'Yuki Tanaka',      email: 'yuki.tanaka@example.com', photoUrl: 'https://i.pravatar.cc/160?img=10', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p11', name: 'Natasha Ivanova',  email: 'natasha.ivanova@example.com', photoUrl: 'https://i.pravatar.cc/160?img=11', dayRate: 1200, allocationPercentage: 90 },
    { id: 'p12', name: 'Daniel Ferreira',  email: 'daniel.ferreira@example.com', photoUrl: 'https://i.pravatar.cc/160?img=12', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p13', name: 'Esi Mensah',       email: 'esi.mensah@example.com', photoUrl: 'https://i.pravatar.cc/160?img=13', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p14', name: 'Oliver Nguyen',    email: 'oliver.nguyen@example.com', photoUrl: 'https://i.pravatar.cc/160?img=14', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p15', name: 'Ingrid Larsson',   email: 'ingrid.larsson@example.com', photoUrl: 'https://i.pravatar.cc/160?img=15', dayRate: 1200, allocationPercentage: 75 },
    { id: 'p16', name: 'Rohan Kapoor',     email: 'rohan.kapoor@example.com', photoUrl: 'https://i.pravatar.cc/160?img=16', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p17', name: 'Chloe Dupont',     email: 'chloe.dupont@example.com', photoUrl: 'https://i.pravatar.cc/160?img=17', dayRate: 1200, allocationPercentage: 100 },
    { id: 'p18', name: 'Kofi Acheampong',  email: 'kofi.acheampong@example.com', photoUrl: 'https://i.pravatar.cc/160?img=18', dayRate: 1200, allocationPercentage: 100 },
  ];

  // ── Delivery Unit 1: Platform Engineering ───────────────────────────────────
  const du1 = {
    id: 'du01',
    name: 'Platform Engineering',
    description: 'Owns the internal developer platform, infrastructure, and shared services that underpin all product delivery.',
    assignments: [
      { personId: 'p01', role: 'Delivery Unit Owner' },
      { personId: 'p02', role: 'Chief Product Owner' },
      { personId: 'p03', role: 'Delivery Lead' },
    ],
    releaseTrains: [
      {
        id: 'rt01',
        name: 'Core Infrastructure ART',
        description: 'Responsible for cloud infrastructure, networking, and security foundations.',
        assignments: [
          { personId: 'p04', role: 'Release Train Engineer' },
          { personId: 'p05', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq01',
            name: 'Cloud Operations',
            description: 'Manages cloud provisioning, cost optimisation, and reliability.',
            assignments: [
              { personId: 'p06', role: 'Squad Member' },
              { personId: 'p07', role: 'Squad Member' },
            ],
            onboarding: {
              sprintName: 'S-42',
              hiringPriority: 'High',
              pendingOffboarding: 1,
              avgRampUpDays: 12,
              candidates: [
                { id: 'c01', name: 'Alice Thompson', stage: 'Recruitment' },
                { id: 'c02', name: 'Bob Chen',       stage: 'Recruitment' },
                { id: 'c03', name: 'Clara Marsh',    stage: 'Pre-boarding' },
                { id: 'c04', name: 'Dan Rivera',     stage: 'Ramp-up' },
                { id: 'c05', name: 'Eve Okonkwo',    stage: 'Ramp-up' },
              ],
              openPositions: [
                { id: 'op01', title: 'Senior Cloud Engineer',      priority: 'High' },
                { id: 'op02', title: 'Site Reliability Engineer',  priority: 'Medium' },
              ],
              sprintTasks: [
                { id: 'st01', title: 'Real-time S3 Ingestion Hook',   assigneePersonId: 'p06', status: 'In Progress' },
                { id: 'st02', title: 'Schema Registry Integration',    assigneePersonId: 'p07', status: 'To Do' },
                { id: 'st03', title: 'Cost Dashboard v2',                               status: 'To Do' },
              ],
            },
          },
          {
            id: 'sq02',
            name: 'Security & Compliance',
            description: 'Oversees platform security controls, vulnerability management, and audit readiness.',
            assignments: [
              { personId: 'p08', role: 'Squad Member' },
              { personId: 'p09', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq03',
            name: 'Networking',
            description: 'Owns network topology, DNS, load balancing, and connectivity between services.',
            assignments: [
              { personId: 'p10', role: 'Squad Member' },
            ],
          },
        ],
      },
      {
        id: 'rt02',
        name: 'Developer Experience ART',
        description: 'Builds tooling and workflows that improve engineering velocity across all product teams.',
        assignments: [
          { personId: 'p11', role: 'Release Train Engineer' },
          { personId: 'p12', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq04',
            name: 'CI/CD Platform',
            description: 'Maintains and evolves the continuous integration and deployment pipeline infrastructure.',
            assignments: [
              { personId: 'p13', role: 'Squad Member' },
              { personId: 'p14', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq05',
            name: 'Developer Tooling',
            description: 'Owns internal CLIs, SDKs, code generation tools, and local development environments.',
            assignments: [
              { personId: 'p15', role: 'Squad Member' },
            ],
          },
        ],
      },
    ],
    onboarding: {
      overallHealthStatus: 'Healthy',
      totalNewHires: 8,
      totalOpenRoles: 12,
      totalPendingOffboarding: 2,
    },
  };

  // ── Delivery Unit 2: Customer Products ─────────────────────────────────────
  const du2 = {
    id: 'du02',
    name: 'Customer Products',
    description: 'Delivers the end-user facing product suite including payments, onboarding, and the customer portal.',
    assignments: [
      { personId: 'p16', role: 'Delivery Unit Owner' },
      { personId: 'p17', role: 'Chief Product Owner' },
      { personId: 'p18', role: 'Delivery Lead' },
    ],
    releaseTrains: [
      {
        id: 'rt03',
        name: 'Payments ART',
        description: 'End-to-end payment processing, fraud detection, and financial reconciliation.',
        assignments: [
          { personId: 'p06', role: 'Release Train Engineer' },
          { personId: 'p08', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq06',
            name: 'Payments Core',
            description: 'Processes transactions, manages payment gateways, and handles reconciliation.',
            assignments: [
              { personId: 'p09', role: 'Squad Member' },
              { personId: 'p10', role: 'Squad Member' },
              { personId: 'p11', role: 'Squad Member' },
            ],
            onboarding: {
              sprintName: 'S-17',
              hiringPriority: 'Medium',
              pendingOffboarding: 0,
              avgRampUpDays: 18,
              candidates: [
                { id: 'c06', name: 'Fiona Blake',   stage: 'Recruitment' },
                { id: 'c07', name: 'George Addo',   stage: 'Pre-boarding' },
                { id: 'c08', name: 'Hana Sato',     stage: 'Ramp-up' },
              ],
              openPositions: [
                { id: 'op03', title: 'Backend Engineer – Payments', priority: 'Medium' },
              ],
              sprintTasks: [
                { id: 'st04', title: 'PCI-DSS Token Vault Migration',   assigneePersonId: 'p09', status: 'In Progress' },
                { id: 'st05', title: 'Refund Workflow Refactor',         assigneePersonId: 'p10', status: 'In Progress' },
                { id: 'st06', title: 'Gateway Timeout Alerts',           assigneePersonId: 'p11', status: 'Done' },
                { id: 'st07', title: 'Batch Reconciliation Performance',                          status: 'To Do' },
              ],
            },
          },
          {
            id: 'sq07',
            name: 'Fraud & Risk',
            description: 'Real-time fraud detection, risk scoring, and chargeback management.',
            assignments: [
              { personId: 'p12', role: 'Squad Member' },
              { personId: 'p13', role: 'Squad Member' },
            ],
          },
        ],
      },
      {
        id: 'rt04',
        name: 'Customer Experience ART',
        description: 'Owns the customer portal, onboarding flows, and all user-facing web and mobile surfaces.',
        assignments: [
          { personId: 'p14', role: 'Release Train Engineer' },
          { personId: 'p15', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq08',
            name: 'Web UI',
            description: 'Builds and maintains the customer-facing web application and design system.',
            assignments: [
              { personId: 'p04', role: 'Squad Member' },
              { personId: 'p05', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq09',
            name: 'Mobile Apps',
            description: 'Develops the iOS and Android customer applications.',
            assignments: [
              { personId: 'p07', role: 'Squad Member' },
              { personId: 'p16', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq10',
            name: 'Onboarding',
            description: 'Owns the new customer registration, KYC, and account activation journeys.',
            assignments: [
              { personId: 'p17', role: 'Squad Member' },
              { personId: 'p18', role: 'Squad Member' },
            ],
          },
        ],
      },
    ],
    onboarding: {
      overallHealthStatus: 'Attention',
      totalNewHires: 12,
      totalOpenRoles: 18,
      totalPendingOffboarding: 1,
    },
  };

  return {
    people,
    deliveryUnits: [du1, du2],
    roleConfig: {
      deliveryUnit: [...DEFAULT_DELIVERY_UNIT_ROLES],
      releaseTrain: [...DEFAULT_RELEASE_TRAIN_ROLES],
      squad: [...DEFAULT_SQUAD_ROLES],
    },
  };
}
