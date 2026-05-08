import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { AppData, Person, DeliveryUnit, ReleaseTrain, Squad, Assignment, RoleConfig, SquadOnboarding, DeliveryUnitOnboarding, SquadTemplate } from '../types';
import { loadData, saveData, resetToSampleData as storageSeed, resetToLargeSampleData as storageLargeSeed } from '../utils/storage';

interface AppStoreContextValue {
  data: AppData;
  // People
  addPerson: (p: Omit<Person, 'id'>) => Person;
  updatePerson: (id: string, p: Partial<Omit<Person, 'id'>>) => void;
  deletePerson: (id: string) => void;
  // Delivery Units
  addDeliveryUnit: (du: Omit<DeliveryUnit, 'id' | 'assignments' | 'releaseTrains'>) => DeliveryUnit;
  updateDeliveryUnit: (id: string, du: Partial<Pick<DeliveryUnit, 'name' | 'type' | 'description'>>) => void;
  deleteDeliveryUnit: (id: string) => void;
  // Release Trains
  addReleaseTrain: (duId: string, rt: Omit<ReleaseTrain, 'id' | 'assignments' | 'squads'>) => ReleaseTrain;
  updateReleaseTrain: (duId: string, rtId: string, rt: Partial<Pick<ReleaseTrain, 'name' | 'description'>>) => void;
  deleteReleaseTrain: (duId: string, rtId: string) => void;
  // Squads
  addSquad: (duId: string, rtId: string, sq: Omit<Squad, 'id' | 'assignments'>) => Squad;
  updateSquad: (duId: string, rtId: string, sqId: string, sq: Partial<Pick<Squad, 'name' | 'description'>>) => void;
  deleteSquad: (duId: string, rtId: string, sqId: string) => void;
  // Assignments
  addAssignmentToDU: (duId: string, assignment: Assignment) => void;
  removeAssignmentFromDU: (duId: string, personId: string, role: string) => void;
  updateDUAssignment: (duId: string, personId: string, role: string, patch: Partial<Assignment>) => void;
  addAssignmentToRT: (duId: string, rtId: string, assignment: Assignment) => void;
  removeAssignmentFromRT: (duId: string, rtId: string, personId: string, role: string) => void;
  updateRTAssignment: (duId: string, rtId: string, personId: string, role: string, patch: Partial<Assignment>) => void;
  addAssignmentToSquad: (duId: string, rtId: string, sqId: string, assignment: Assignment) => void;
  removeAssignmentFromSquad: (duId: string, rtId: string, sqId: string, personId: string, role: string) => void;
  updateSquadAssignment: (duId: string, rtId: string, sqId: string, personId: string, role: string, patch: Partial<Assignment>) => void;
  // Lookup helpers
  getPersonById: (id: string) => Person | undefined;
  getDeliveryUnitById: (id: string) => DeliveryUnit | undefined;
  getReleaseTrainById: (duId: string, rtId: string) => ReleaseTrain | undefined;
  getSquadById: (duId: string, rtId: string, sqId: string) => Squad | undefined;
  // Role config
  addRole: (layer: keyof RoleConfig, role: string) => void;
  removeRole: (layer: keyof RoleConfig, role: string) => void;
  resetToSampleData: () => void;
  resetToLargeSampleData: () => void;
  // Onboarding
  updateSquadOnboarding: (duId: string, rtId: string, sqId: string, onboarding: SquadOnboarding) => void;
  updateDeliveryUnitOnboarding: (duId: string, onboarding: DeliveryUnitOnboarding) => void;
  // Squad Templates
  addSquadTemplate: (t: Omit<SquadTemplate, 'id'>) => SquadTemplate;
  updateSquadTemplate: (id: string, t: Partial<Omit<SquadTemplate, 'id'>>) => void;
  deleteSquadTemplate: (id: string) => void;
  applySquadTemplate: (duId: string, rtId: string, sqId: string, templateId: string) => void;
  setShowFinancials: (show: boolean) => void;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);



export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  // ── People ──────────────────────────────────────────────────────────────────
  const addPerson = useCallback((p: Omit<Person, 'id'>): Person => {
    const person: Person = { id: crypto.randomUUID(), ...p };
    setData((prev) => {
      const next = { ...prev, people: [...prev.people, person] };
      saveData(next);
      return next;
    });
    return person;
  }, []);

  const updatePerson = useCallback((id: string, p: Partial<Omit<Person, 'id'>>) => {
    setData((prev) => {
      const next = { ...prev, people: prev.people.map((x) => (x.id === id ? { ...x, ...p } : x)) };
      saveData(next);
      return next;
    });
  }, []);

  const deletePerson = useCallback((id: string) => {
    setData((prev) => {
      // Remove all assignments referencing this person across the whole tree
      const removeFrom = (assignments: Assignment[]) => assignments.filter((a) => a.personId !== id);
      const next: AppData = {
        ...prev,
        roleConfig: prev.roleConfig,
        people: prev.people.filter((p) => p.id !== id),
        deliveryUnits: prev.deliveryUnits.map((du) => ({
          ...du,
          assignments: removeFrom(du.assignments),
          releaseTrains: du.releaseTrains.map((rt) => ({
            ...rt,
            assignments: removeFrom(rt.assignments),
            squads: rt.squads.map((sq) => ({ ...sq, assignments: removeFrom(sq.assignments) })),
          })),
        })),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Delivery Units ──────────────────────────────────────────────────────────
  const addDeliveryUnit = useCallback((du: Omit<DeliveryUnit, 'id' | 'assignments' | 'releaseTrains'>): DeliveryUnit => {
    const newDu: DeliveryUnit = { id: crypto.randomUUID(), assignments: [], releaseTrains: [], ...du };
    setData((prev) => {
      const next = { ...prev, deliveryUnits: [...prev.deliveryUnits, newDu] };
      saveData(next);
      return next;
    });
    return newDu;
  }, []);

  const updateDeliveryUnit = useCallback((id: string, du: Partial<Pick<DeliveryUnit, 'name' | 'type' | 'description'>>) => {
    setData((prev) => {
      const next = { ...prev, deliveryUnits: prev.deliveryUnits.map((x) => (x.id === id ? { ...x, ...du } : x)) };
      saveData(next);
      return next;
    });
  }, []);

  const deleteDeliveryUnit = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, deliveryUnits: prev.deliveryUnits.filter((x) => x.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  // ── Release Trains ──────────────────────────────────────────────────────────
  const addReleaseTrain = useCallback((duId: string, rt: Omit<ReleaseTrain, 'id' | 'assignments' | 'squads'>): ReleaseTrain => {
    const newRt: ReleaseTrain = { id: crypto.randomUUID(), assignments: [], squads: [], ...rt };
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId ? { ...du, releaseTrains: [...du.releaseTrains, newRt] } : du,
        ),
      };
      saveData(next);
      return next;
    });
    return newRt;
  }, []);

  const updateReleaseTrain = useCallback((duId: string, rtId: string, rt: Partial<Pick<ReleaseTrain, 'name' | 'description'>>) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? { ...du, releaseTrains: du.releaseTrains.map((r) => (r.id === rtId ? { ...r, ...rt } : r)) }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const deleteReleaseTrain = useCallback((duId: string, rtId: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId ? { ...du, releaseTrains: du.releaseTrains.filter((r) => r.id !== rtId) } : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Squads ──────────────────────────────────────────────────────────────────
  const addSquad = useCallback((duId: string, rtId: string, sq: Omit<Squad, 'id' | 'assignments'>): Squad => {
    const newSq: Squad = { id: crypto.randomUUID(), assignments: [], ...sq };
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId ? { ...rt, squads: [...rt.squads, newSq] } : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
    return newSq;
  }, []);

  const updateSquad = useCallback((duId: string, rtId: string, sqId: string, sq: Partial<Pick<Squad, 'name' | 'description'>>) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? { ...rt, squads: rt.squads.map((s) => (s.id === sqId ? { ...s, ...sq } : s)) }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const deleteSquad = useCallback((duId: string, rtId: string, sqId: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId ? { ...rt, squads: rt.squads.filter((s) => s.id !== sqId) } : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Assignments – DU ────────────────────────────────────────────────────────
  const addAssignmentToDU = useCallback((duId: string, assignment: Assignment) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId ? { ...du, assignments: [...du.assignments, assignment] } : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const removeAssignmentFromDU = useCallback((duId: string, personId: string, role: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? { ...du, assignments: du.assignments.filter((a) => !(a.personId === personId && a.role === role)) }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const updateDUAssignment = useCallback((duId: string, personId: string, role: string, patch: Partial<Assignment>) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                assignments: du.assignments.map((a) =>
                  a.personId === personId && a.role === role ? { ...a, ...patch } : a,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Assignments – RT ────────────────────────────────────────────────────────
  const addAssignmentToRT = useCallback((duId: string, rtId: string, assignment: Assignment) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId ? { ...rt, assignments: [...rt.assignments, assignment] } : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const removeAssignmentFromRT = useCallback((duId: string, rtId: string, personId: string, role: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? { ...rt, assignments: rt.assignments.filter((a) => !(a.personId === personId && a.role === role)) }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const updateRTAssignment = useCallback((duId: string, rtId: string, personId: string, role: string, patch: Partial<Assignment>) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? {
                        ...rt,
                        assignments: rt.assignments.map((a) =>
                          a.personId === personId && a.role === role ? { ...a, ...patch } : a,
                        ),
                      }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Assignments – Squad ─────────────────────────────────────────────────────
  const addAssignmentToSquad = useCallback((duId: string, rtId: string, sqId: string, assignment: Assignment) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? {
                        ...rt,
                        squads: rt.squads.map((sq) =>
                          sq.id === sqId ? { ...sq, assignments: [...sq.assignments, assignment] } : sq,
                        ),
                      }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const updateSquadAssignment = useCallback((duId: string, rtId: string, sqId: string, personId: string, role: string, patch: Partial<Assignment>) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? {
                        ...rt,
                        squads: rt.squads.map((sq) =>
                          sq.id === sqId
                            ? {
                                ...sq,
                                assignments: sq.assignments.map((a) =>
                                  a.personId === personId && a.role === role ? { ...a, ...patch } : a,
                                ),
                              }
                            : sq,
                        ),
                      }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const removeAssignmentFromSquad = useCallback((duId: string, rtId: string, sqId: string, personId: string, role: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id === duId
            ? {
                ...du,
                releaseTrains: du.releaseTrains.map((rt) =>
                  rt.id === rtId
                    ? {
                        ...rt,
                        squads: rt.squads.map((sq) =>
                          sq.id === sqId
                            ? { ...sq, assignments: sq.assignments.filter((a) => !(a.personId === personId && a.role === role)) }
                            : sq,
                        ),
                      }
                    : rt,
                ),
              }
            : du,
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Role Config ─────────────────────────────────────────────────────────────
  const addRole = useCallback((layer: keyof RoleConfig, role: string) => {
    setData((prev) => {
      if (prev.roleConfig[layer].includes(role)) return prev;
      const next = { ...prev, roleConfig: { ...prev.roleConfig, [layer]: [...prev.roleConfig[layer], role] } };
      saveData(next);
      return next;
    });
  }, []);

  const removeRole = useCallback((layer: keyof RoleConfig, role: string) => {
    setData((prev) => {
      const next = { ...prev, roleConfig: { ...prev.roleConfig, [layer]: prev.roleConfig[layer].filter((r) => r !== role) } };
      saveData(next);
      return next;
    });
  }, []);

  const resetToSampleData = useCallback(() => {
    const seed = storageSeed();
    setData(seed);
  }, []);

  const resetToLargeSampleData = useCallback(() => {
    const seed = storageLargeSeed();
    setData(seed);
  }, []);

  const updateSquadOnboarding = useCallback((duId: string, rtId: string, sqId: string, onboarding: SquadOnboarding) => {
    setData((prev) => {
      const next: AppData = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id !== duId ? du : {
            ...du,
            releaseTrains: du.releaseTrains.map((rt) =>
              rt.id !== rtId ? rt : {
                ...rt,
                squads: rt.squads.map((sq) =>
                  sq.id !== sqId ? sq : { ...sq, onboarding }
                ),
              }
            ),
          }
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const updateDeliveryUnitOnboarding = useCallback((duId: string, onboarding: DeliveryUnitOnboarding) => {
    setData((prev) => {
      const next: AppData = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id !== duId ? du : { ...du, onboarding }
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Squad Templates ─────────────────────────────────────────────────────────
  const addSquadTemplate = useCallback((t: Omit<SquadTemplate, 'id'>): SquadTemplate => {
    const tmpl: SquadTemplate = { id: crypto.randomUUID(), ...t };
    setData((prev) => {
      const next = { ...prev, squadTemplates: [...prev.squadTemplates, tmpl] };
      saveData(next);
      return next;
    });
    return tmpl;
  }, []);

  const updateSquadTemplate = useCallback((id: string, t: Partial<Omit<SquadTemplate, 'id'>>) => {
    setData((prev) => {
      const next = { ...prev, squadTemplates: prev.squadTemplates.map((x) => (x.id === id ? { ...x, ...t } : x)) };
      saveData(next);
      return next;
    });
  }, []);

  const deleteSquadTemplate = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, squadTemplates: prev.squadTemplates.filter((x) => x.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  const applySquadTemplate = useCallback((duId: string, rtId: string, sqId: string, templateId: string) => {
    setData((prev) => {
      const tmpl = prev.squadTemplates.find((t) => t.id === templateId);
      if (!tmpl) return prev;
      const newPositions = tmpl.roles.flatMap(({ role, count }) =>
        Array.from({ length: count }, () => ({
          id: crypto.randomUUID(),
          title: role,
          priority: 'Medium' as const,
          allocationPercentage: 100,
        }))
      );
      const next: AppData = {
        ...prev,
        deliveryUnits: prev.deliveryUnits.map((du) =>
          du.id !== duId ? du : {
            ...du,
            releaseTrains: du.releaseTrains.map((rt) =>
              rt.id !== rtId ? rt : {
                ...rt,
                squads: rt.squads.map((sq) => {
                  if (sq.id !== sqId) return sq;
                  const existing = sq.onboarding ?? { candidates: [], openPositions: [] };
                  return { ...sq, onboarding: { ...existing, openPositions: [...existing.openPositions, ...newPositions] } };
                }),
              }
            ),
          }
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  const setShowFinancials = useCallback((show: boolean) => {
    setData((prev) => {
      const next: AppData = {
        ...prev,
        uiSettings: {
          ...prev.uiSettings,
          showFinancials: show,
        },
      };
      saveData(next);
      return next;
    });
  }, []);

  // ── Lookup helpers ──────────────────────────────────────────────────────────
  const getPersonById = useCallback((id: string) => data.people.find((p) => p.id === id), [data]);
  const getDeliveryUnitById = useCallback((id: string) => data.deliveryUnits.find((d) => d.id === id), [data]);
  const getReleaseTrainById = useCallback((duId: string, rtId: string) => data.deliveryUnits.find((d) => d.id === duId)?.releaseTrains.find((r) => r.id === rtId), [data]);
  const getSquadById = useCallback((duId: string, rtId: string, sqId: string) => data.deliveryUnits.find((d) => d.id === duId)?.releaseTrains.find((r) => r.id === rtId)?.squads.find((s) => s.id === sqId), [data]);

  return (
    <AppStoreContext.Provider
      value={{
        data,
        addPerson, updatePerson, deletePerson,
        addDeliveryUnit, updateDeliveryUnit, deleteDeliveryUnit,
        addReleaseTrain, updateReleaseTrain, deleteReleaseTrain,
        addSquad, updateSquad, deleteSquad,
        addAssignmentToDU, removeAssignmentFromDU, updateDUAssignment,
        addAssignmentToRT, removeAssignmentFromRT, updateRTAssignment,
        addAssignmentToSquad, removeAssignmentFromSquad, updateSquadAssignment,
        getPersonById, getDeliveryUnitById, getReleaseTrainById, getSquadById,
        addRole, removeRole, resetToSampleData, updateSquadOnboarding, updateDeliveryUnitOnboarding,
        resetToLargeSampleData,
        addSquadTemplate, updateSquadTemplate, deleteSquadTemplate, applySquadTemplate,
        setShowFinancials,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
