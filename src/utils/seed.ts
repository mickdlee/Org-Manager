import type { AppData } from '../types';
import { DEFAULT_DELIVERY_UNIT_ROLES, DEFAULT_RELEASE_TRAIN_ROLES, DEFAULT_SQUAD_ROLES } from '../types';

export function generateSeedData(): AppData {
  const baseYear = new Date().getFullYear();
  const nextThreeYears = [baseYear, baseYear + 1, baseYear + 2];

  const buildKR = (
    id: string,
    title: string,
    baseline: string,
    notes: string,
    targets: [string, string, string],
  ) => ({
    id,
    title,
    baseline,
    notes,
    yearlyTargets: nextThreeYears.map((year, idx) => ({
      year,
      target: targets[idx],
    })),
  });

  // ── People ──────────────────────────────────────────────────────────────────
  const people = [
    { id: 'p01', name: 'Sarah Mitchell',   email: 'sarah.mitchell@example.com', photoUrl: 'https://i.pravatar.cc/160?img=1', dayRate: 1200 },
    { id: 'p02', name: 'James Okafor',     email: 'james.okafor@example.com', photoUrl: 'https://i.pravatar.cc/160?img=2', dayRate: 1200 },
    { id: 'p03', name: 'Priya Nair',       email: 'priya.nair@example.com', photoUrl: 'https://i.pravatar.cc/160?img=3', dayRate: 1200 },
    { id: 'p04', name: 'Tom Bergström',    email: 'tom.bergstrom@example.com', photoUrl: 'https://i.pravatar.cc/160?img=4', dayRate: 1200 },
    { id: 'p05', name: 'Amelia Rossi',     email: 'amelia.rossi@example.com', photoUrl: 'https://i.pravatar.cc/160?img=5', dayRate: 1200 },
    { id: 'p06', name: 'Chen Wei',         email: 'chen.wei@example.com', photoUrl: 'https://i.pravatar.cc/160?img=6', dayRate: 1200 },
    { id: 'p07', name: 'Marcus Johansson', email: 'marcus.johansson@example.com', photoUrl: 'https://i.pravatar.cc/160?img=7', dayRate: 1200 },
    { id: 'p08', name: 'Fatima Al-Hassan', email: 'fatima.alhassan@example.com', photoUrl: 'https://i.pravatar.cc/160?img=8', dayRate: 1200 },
    { id: 'p09', name: 'Liam Fitzgerald',  email: 'liam.fitzgerald@example.com', photoUrl: 'https://i.pravatar.cc/160?img=9', dayRate: 1200 },
    { id: 'p10', name: 'Yuki Tanaka',      email: 'yuki.tanaka@example.com', photoUrl: 'https://i.pravatar.cc/160?img=10', dayRate: 1200 },
    { id: 'p11', name: 'Natasha Ivanova',  email: 'natasha.ivanova@example.com', photoUrl: 'https://i.pravatar.cc/160?img=11', dayRate: 1200 },
    { id: 'p12', name: 'Daniel Ferreira',  email: 'daniel.ferreira@example.com', photoUrl: 'https://i.pravatar.cc/160?img=12', dayRate: 1200 },
    { id: 'p13', name: 'Esi Mensah',       email: 'esi.mensah@example.com', photoUrl: 'https://i.pravatar.cc/160?img=13', dayRate: 1200 },
    { id: 'p14', name: 'Oliver Nguyen',    email: 'oliver.nguyen@example.com', photoUrl: 'https://i.pravatar.cc/160?img=14', dayRate: 1200 },
    { id: 'p15', name: 'Ingrid Larsson',   email: 'ingrid.larsson@example.com', photoUrl: 'https://i.pravatar.cc/160?img=15', dayRate: 1200 },
    { id: 'p16', name: 'Rohan Kapoor',     email: 'rohan.kapoor@example.com', photoUrl: 'https://i.pravatar.cc/160?img=16', dayRate: 1200 },
    { id: 'p17', name: 'Chloe Dupont',     email: 'chloe.dupont@example.com', photoUrl: 'https://i.pravatar.cc/160?img=17', dayRate: 1200 },
    { id: 'p18', name: 'Kofi Acheampong',  email: 'kofi.acheampong@example.com', photoUrl: 'https://i.pravatar.cc/160?img=18', dayRate: 1200 },
  ];

  // ── Delivery Unit 1: Retail Banking Operations ─────────────────────────────
  const du1 = {
    id: 'du01',
    name: 'Retail Banking Operations',
    type: 'Customer Journey' as const,
    description: 'Owns the internal developer platform, infrastructure, and shared services that underpin all product delivery.',
    assignments: [
      { personId: 'p01', role: 'Delivery Unit Owner' },
      { personId: 'p02', role: 'Chief Product Owner' },
      { personId: 'p03', role: 'Delivery Lead' },
    ],
    releaseTrains: [
      {
        id: 'rt01',
        name: 'Core Banking ART',
        description: 'Responsible for cloud infrastructure, networking, and security foundations.',
        assignments: [
          { personId: 'p04', role: 'Release Train Engineer' },
          { personId: 'p05', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq01',
            name: 'Account Services',
            description: 'Manages cloud provisioning, cost optimisation, and reliability.',
            assignments: [
              { personId: 'p06', role: 'Squad Member' },
              { personId: 'p07', role: 'Squad Member' },
            ],
            onboarding: {
              hiringPriority: 'High',
              pendingOffboarding: 1,
              avgRampUpDays: 12,
              candidates: [
                { id: 'c01', name: 'Alice Thompson', stage: 'Recruitment' },
              ],
              openPositions: [
                { id: 'op01', title: 'Senior Cloud Engineer',      priority: 'High' },
              ],
            },
          },
          {
            id: 'sq02',
            name: 'Fraud Controls',
            description: 'Oversees platform security controls, vulnerability management, and audit readiness.',
            assignments: [
              { personId: 'p08', role: 'Squad Member' },
              { personId: 'p09', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq03',
            name: 'Payments Routing',
            description: 'Owns network topology, DNS, load balancing, and connectivity between services.',
            assignments: [
              { personId: 'p10', role: 'Squad Member' },
            ],
          },
        ],
      },
      {
        id: 'rt02',
        name: 'Digital Channels ART',
        description: 'Builds tooling and workflows that improve engineering velocity across all product teams.',
        assignments: [
          { personId: 'p11', role: 'Release Train Engineer' },
          { personId: 'p12', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq04',
            name: 'Card Processing',
            description: 'Maintains and evolves the continuous integration and deployment pipeline infrastructure.',
            assignments: [
              { personId: 'p13', role: 'Squad Member' },
              { personId: 'p14', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq05',
            name: 'Ledger & Reconciliation',
            description: 'Owns internal CLIs, SDKs, code generation tools, and local development environments.',
            assignments: [
              { personId: 'p15', role: 'Squad Member' },
            ],
          },
        ],
        openPositions: [
          { id: 'dup01-rt01-1', title: 'Senior Cloud Architect', priority: 'High', allocationPercentage: 100 },
        ],
      },
    ],
    openPositions: [
      { id: 'dup01-1', title: 'Platform Lead', priority: 'Medium', allocationPercentage: 100 },
    ],
    onboarding: {
      overallHealthStatus: 'Healthy',
      totalNewHires: 1,
      totalOpenRoles: 1,
      totalPendingOffboarding: 2,
    },
    okrs: [
      {
        id: 'okr-du01-1',
        objective: 'Improve retail payments reliability',
        keyResults: [
          buildKR('kr-du01-1-1', 'Reduce payment incident rate', 'Current incident rate: 2.1%', 'Focus on top 3 recurring root causes.', ['10%', '20%', '30%']),
          buildKR('kr-du01-1-2', 'Achieve monthly availability', 'Current availability: 99.82%', 'Requires resilience work across card and clearing paths.', ['99.90%', '99.93%', '99.95%']),
          buildKR('kr-du01-1-3', 'Cut mean time to recovery', 'Current MTTR: 42 min', 'Implement playbooks and auto-remediation.', ['35 min', '25 min', '20 min']),
        ],
        progress: 45,
        targetDate: '2026-09-30',
      },
      {
        id: 'okr-du01-2',
        objective: 'Increase engineering throughput',
        keyResults: [
          buildKR('kr-du01-2-1', 'Reduce lead time for change', 'Current lead time: 9.6 days', 'Prioritize trunk-based flow and test stability.', ['10%', '18%', '25%']),
          buildKR('kr-du01-2-2', 'Automate release checks', 'Current automation coverage: 22%', 'Expand quality gates in CI pipelines.', ['35%', '50%', '60%']),
        ],
        progress: 35,
        targetDate: '2026-12-31',
      },
    ],
  };

  // ── Delivery Unit 2: Customer Banking ──────────────────────────────────────
  const du2 = {
    id: 'du02',
    name: 'Customer Banking',
    type: 'Customer Journey' as const,
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
              hiringPriority: 'Medium',
              pendingOffboarding: 0,
              avgRampUpDays: 18,
              candidates: [],
              openPositions: [],
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
        openPositions: [
          { id: 'dup02-rt03-1', title: 'Payment Systems Lead', priority: 'High', allocationPercentage: 100 },
        ],
      },
      {
        id: 'rt04',
        name: 'Lending & Onboarding ART',
        description: 'Owns the customer portal, onboarding flows, and all user-facing web and mobile surfaces.',
        assignments: [
          { personId: 'p14', role: 'Release Train Engineer' },
          { personId: 'p15', role: 'Product Owner' },
        ],
        squads: [
          {
            id: 'sq08',
            name: 'Mortgage Journey',
            description: 'Builds and maintains the customer-facing web application and design system.',
            assignments: [
              { personId: 'p04', role: 'Squad Member' },
              { personId: 'p05', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq09',
            name: 'Mobile Banking',
            description: 'Develops the iOS and Android customer applications.',
            assignments: [
              { personId: 'p07', role: 'Squad Member' },
              { personId: 'p16', role: 'Squad Member' },
            ],
          },
          {
            id: 'sq10',
            name: 'KYC & Onboarding',
            description: 'Owns the new customer registration, KYC, and account activation journeys.',
            assignments: [
              { personId: 'p17', role: 'Squad Member' },
              { personId: 'p18', role: 'Squad Member' },
            ],
          },
        ],
        openPositions: [
          { id: 'dup02-rt04-1', title: 'Frontend Architect', priority: 'Medium', allocationPercentage: 100 },
        ],
      },
    ],
    openPositions: [
      { id: 'dup02-1', title: 'Product Strategy Lead', priority: 'Low', allocationPercentage: 100 },
    ],
    onboarding: {
      overallHealthStatus: 'Attention',
      totalNewHires: 0,
      totalOpenRoles: 0,
      totalPendingOffboarding: 1,
    },
    okrs: [
      {
        id: 'okr-du02-1',
        objective: 'Grow digital lending conversion',
        keyResults: [
          buildKR('kr-du02-1-1', 'Increase approved applications', 'Current approval rate: 41%', 'Improve credit model explainability and offer fit.', ['5%', '10%', '15%']),
          buildKR('kr-du02-1-2', 'Reduce onboarding drop-off', 'Current drop-off: 33%', 'Simplify KYC and reduce document friction.', ['8%', '14%', '20%']),
          buildKR('kr-du02-1-3', 'Improve NPS', 'Current NPS: 36', 'Address clarity of loan terms and status updates.', ['+3', '+6', '+8']),
        ],
        progress: 28,
        targetDate: '2026-10-31',
      },
    ],
  };

  return {
    people,
    deliveryUnits: [du1, du2],
    roleConfig: {
      deliveryUnit: [...DEFAULT_DELIVERY_UNIT_ROLES],
      releaseTrain: [...DEFAULT_RELEASE_TRAIN_ROLES],
      squad: [...DEFAULT_SQUAD_ROLES],
    },
    squadTemplates: [],
    uiSettings: {
      showFinancials: true,
    },
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function pickAllocationPercentage(): number {
  const roll = Math.random();
  if (roll < 0.8) return 100;
  if (roll < 0.95) return 50;
  return 20;
}

export function generateLargeSeedData(): AppData {
  const firstNames = ['Ava', 'Noah', 'Liam', 'Emma', 'Olivia', 'Mason', 'Lucas', 'Sophia', 'Mia', 'Ethan', 'Zoe', 'Ivy', 'Leo', 'Ravi', 'Amira', 'Hana', 'Nina', 'Jonas', 'Kofi', 'Priya'];
  const lastNames = ['Walker', 'Nguyen', 'Patel', 'Smith', 'Singh', 'Tanaka', 'Garcia', 'Rossi', 'Mensah', 'Ivanov', 'Larsson', 'Miller', 'Khan', 'Dubois', 'Berg', 'Chen', 'Nair', 'Kapoor', 'Lopez', 'Yamada'];
  const duPrefixes = ['Retail Banking', 'Commercial Banking', 'Cards & Payments', 'Deposits', 'Lending', 'Digital Banking', 'Fraud & Risk', 'Treasury Services', 'Customer Onboarding', 'Core Banking'];
  const rtNames = ['Core Banking ART', 'Cards ART', 'Payments ART', 'Lending ART', 'Risk ART', 'Customer Channels ART'];
  const squadPrefixes = ['Accounts', 'Cards', 'Payments', 'Lending', 'KYC', 'Fraud', 'Collections', 'Treasury', 'Mobile Banking', 'Digital Channels'];
  const squadSuffixes = ['Team', 'Squad', 'Cell', 'Pod'];
  const onboardingActivityRate = 0.08;
  const openRoleRate = 0.08;

  const peopleCount = 300;
  let extraPeopleCount = 0;
  const people = Array.from({ length: peopleCount }, (_, i) => {
    const id = `p${String(i + 1).padStart(3, '0')}`;
    const first = pick(firstNames);
    const last = pick(lastNames);
    const name = `${first} ${last}`;
    return {
      id,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i + 1}@example.com`,
      photoUrl: `https://i.pravatar.cc/160?img=${(i % 70) + 1}`,
      dayRate: randInt(850, 1650),
    };
  });

  const remainingSquadAllocation = new Map<string, number>(
    people.map((p) => [p.id, 100]),
  );

  const addExtraPerson = () => {
    const idx = peopleCount + extraPeopleCount + 1;
    extraPeopleCount += 1;
    const id = `p${String(idx).padStart(3, '0')}`;
    const first = pick(firstNames);
    const last = pick(lastNames);
    const name = `${first} ${last}`;
    const person = {
      id,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${idx}@example.com`,
      photoUrl: `https://i.pravatar.cc/160?img=${((idx - 1) % 70) + 1}`,
      dayRate: randInt(850, 1650),
    };
    people.push(person);
    remainingSquadAllocation.set(id, 100);
    return id;
  };

  const allocateSquadPerson = (allocation: number, usedInSquad: Set<string>) => {
    for (const p of people) {
      if (usedInSquad.has(p.id)) continue;
      const remaining = remainingSquadAllocation.get(p.id) ?? 0;
      if (remaining >= allocation) {
        remainingSquadAllocation.set(p.id, remaining - allocation);
        usedInSquad.add(p.id);
        return p.id;
      }
    }

    const id = addExtraPerson();
    remainingSquadAllocation.set(id, 100 - allocation);
    usedInSquad.add(id);
    return id;
  };

  let personCursor = 0;
  const nextPersonId = () => {
    const id = people[personCursor % people.length].id;
    personCursor += 1;
    return id;
  };

  let rtCounter = 1;
  let sqCounter = 1;
  let candidateCounter = 1;
  let openPositionCounter = 1;

  const deliveryUnits = Array.from({ length: 20 }, (_, i) => {
    const duId = `du${String(i + 1).padStart(2, '0')}`;
    const duType = pick(['Customer Journey', 'Platform', 'Supporting'] as const);
    const duName = `${pick(duPrefixes)} ${i + 1}`;
    const rtCount = randInt(1, 5);

    const releaseTrains = Array.from({ length: rtCount }, (_, rtIdx) => {
      const rtId = `rt${String(rtCounter++).padStart(3, '0')}`;
      const squadCount = randInt(5, 8);
      const rtName = `${pick(rtNames)} ${rtIdx + 1}`;

      const squads = Array.from({ length: squadCount }, (_, sqIdx) => {
        const sqId = `sq${String(sqCounter++).padStart(4, '0')}`;
        const squadName = `${pick(squadPrefixes)} ${pick(squadSuffixes)} ${sqIdx + 1}`;

        const assignmentCount = randInt(2, 5);
        const usedInSquad = new Set<string>();
        const assignments = Array.from({ length: assignmentCount }, () => {
          const allocationPercentage = pickAllocationPercentage();
          const personId = allocateSquadPerson(allocationPercentage, usedInSquad);
          return {
            personId,
            role: 'Squad Member',
            allocationPercentage,
          };
        });

        const candidateCount = Math.random() < onboardingActivityRate ? 1 : 0;
        const openRolesCount = Math.random() < openRoleRate ? 1 : 0;

        return {
          id: sqId,
          name: squadName,
          description: `${squadName} delivery squad for ${duName}.`,
          assignments,
          onboarding: {
            hiringPriority: pick(['Low', 'Medium', 'High'] as const),
            pendingOffboarding: randInt(0, 2),
            avgRampUpDays: randInt(8, 25),
            candidates: Array.from({ length: candidateCount }, () => ({
              id: `c${String(candidateCounter++).padStart(4, '0')}`,
              name: `${pick(firstNames)} ${pick(lastNames)}`,
              stage: pick(['Recruitment', 'Pre-boarding', 'Ramp-up'] as const),
            })),
            openPositions: Array.from({ length: openRolesCount }, () => ({
              id: `op${String(openPositionCounter++).padStart(4, '0')}`,
              title: pick([...DEFAULT_SQUAD_ROLES]),
              priority: pick(['Low', 'Medium', 'High'] as const),
              allocationPercentage: pickAllocationPercentage(),
            })),
          },
        };
      });

      const rtOpenRolesCount = Math.random() < openRoleRate ? 1 : 0;
      return {
        id: rtId,
        name: rtName,
        description: `${rtName} coordinating squads in ${duName}.`,
        assignments: [
          { personId: nextPersonId(), role: 'Release Train Engineer' },
          { personId: nextPersonId(), role: 'Product Owner' },
        ],
        squads,
        openPositions: Array.from({ length: rtOpenRolesCount }, () => ({
          id: `op${String(openPositionCounter++).padStart(4, '0')}`,
          title: pick([...DEFAULT_RELEASE_TRAIN_ROLES]),
          priority: pick(['Low', 'Medium', 'High'] as const),
          allocationPercentage: pickAllocationPercentage(),
        })),
      };
    });

    const duOpenRolesCount = Math.random() < openRoleRate ? 1 : 0;
    return {
      id: duId,
      name: duName,
      type: duType,
      description: `${duName} oversees product and platform outcomes across multiple release trains.`,
      okrs: [],
      assignments: [
        { personId: nextPersonId(), role: 'Delivery Unit Owner' },
        { personId: nextPersonId(), role: 'Chief Product Owner' },
        { personId: nextPersonId(), role: 'Delivery Lead' },
      ],
      releaseTrains,
      openPositions: Array.from({ length: duOpenRolesCount }, () => ({
        id: `op${String(openPositionCounter++).padStart(4, '0')}`,
        title: pick([...DEFAULT_DELIVERY_UNIT_ROLES]),
        priority: pick(['Low', 'Medium', 'High'] as const),
        allocationPercentage: pickAllocationPercentage(),
      })),
      onboarding: {
        overallHealthStatus: pick(['Healthy', 'Attention', 'Critical'] as const),
        totalNewHires: randInt(3, 35),
        totalOpenRoles: releaseTrains.reduce(
          (sum, rt) => sum + rt.squads.reduce((sqSum, sq) => sqSum + (sq.onboarding?.openPositions.length ?? 0), 0),
          0,
        ),
        totalPendingOffboarding: randInt(0, 5),
      },
    };
  });

  return {
    people,
    deliveryUnits,
    roleConfig: {
      deliveryUnit: [...DEFAULT_DELIVERY_UNIT_ROLES],
      releaseTrain: [...DEFAULT_RELEASE_TRAIN_ROLES],
      squad: [...DEFAULT_SQUAD_ROLES],
    },
    squadTemplates: [],
    uiSettings: {
      showFinancials: true,
    },
  };
}
