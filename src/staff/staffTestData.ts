import type { StaffMember } from './staff';

export const staffTestData: StaffMember[] = [
  { id: 'c1', name: 'Camila Restrepo', email: 'camila@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-10T15:00:00Z' },
  { id: 'c2', name: 'Mateo Rojas', email: 'mateo@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-11T09:30:00Z' },
  { id: 'c3', name: 'Laura Pineda', email: 'laura@travesianatural.co', role: 'Colaborador operativo', tenant: 'Travesia Natural', createdAt: '2026-10-09T13:15:00Z', active: false },
];
