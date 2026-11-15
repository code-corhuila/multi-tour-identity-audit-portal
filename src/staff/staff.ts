// One internal user of the tenant as the staff views show it (Mockup admin-colaboradores.html).
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: string;
  // RFC 3339 in UTC.
  createdAt: string;
  // Absent means active (Mockup: c.active !== false).
  active?: boolean;
}

export type StaffSource = () => Promise<StaffMember[]>;

// shortcut: the identity services have no route to list internal users yet (portal 004 G-3); the members are test
// data behind the dev flag and the production build gets an empty team. Replace by the real call when the contract has it.
export const stubStaffSource: StaffSource = async () => (import.meta.env.DEV ? (await import('./staffTestData')).staffTestData : []);
