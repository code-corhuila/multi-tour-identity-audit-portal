// Roles of the token (security.yaml). The screen is chosen by role; the services still refuse every call that is not
// for the role, so this only decides what to show.
export const PLATFORM_ADMINISTRATOR = 'PLATFORM_ADMINISTRATOR';
export const FINAL_CUSTOMER = 'FINAL_CUSTOMER';
export const STAFF_ROLES = ['TENANT_ADMINISTRATOR', 'OPERATIONAL_COLLABORATOR', 'MANAGER', 'ACCOUNTANT', 'ANALYST'];

export const isStaff = (roles: string[]): boolean => roles.some((r) => STAFF_ROLES.includes(r));

// The only area of the container reachable in this version (route of multi-tour-front).
export const commercialAreaHref = (identifier: string): string => `/t/${identifier}/areas/commercial-reservation-portal`;
