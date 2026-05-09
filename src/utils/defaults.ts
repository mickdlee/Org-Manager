import type { SquadTemplateRole } from '../types';

export const DEFAULT_SQUAD_TEMPLATE_ID = 'tmpl-default-balanced-squad';
export const DEFAULT_SQUAD_TEMPLATE_NAME = 'Default Squad';

export const DEFAULT_SQUAD_TEMPLATE_ROLES: SquadTemplateRole[] = [
  { role: 'Product Owner', count: 1 },
  { role: 'Scrum Master', count: 1 },
  { role: 'Business Analyst', count: 2 },
  { role: 'Developer', count: 4 },
  { role: 'Quality Assurance', count: 2 },
];

export const DEFAULT_SQUAD_TEMPLATE = {
  id: DEFAULT_SQUAD_TEMPLATE_ID,
  name: DEFAULT_SQUAD_TEMPLATE_NAME,
  roles: DEFAULT_SQUAD_TEMPLATE_ROLES,
} as const;

export function cloneDefaultSquadTemplate() {
  return {
    ...DEFAULT_SQUAD_TEMPLATE,
    roles: DEFAULT_SQUAD_TEMPLATE.roles.map((r) => ({ ...r })),
  };
}
