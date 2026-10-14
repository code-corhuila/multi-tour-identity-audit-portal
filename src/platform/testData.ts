// TEST DATA: values the service cannot answer yet. Loaded only when VITE_STUB is "true" (spec 007 D-05), never in a
// production build. The marker below is what the build check looks for.
export const testData = {
  marker: 'TEST-DATA-NOT-FOR-PRODUCTION',
  signupsThisMonth: 2,
} as const;
