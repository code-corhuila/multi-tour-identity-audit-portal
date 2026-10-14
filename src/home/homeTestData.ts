// Numbers of the staff home of the Mockup. They belong to commercial-reservation and cash-reporting, which this
// portal does not build (spec 011 RN-CAL-HOM-02): they are shown labelled as test data and only outside the
// production build.
export const homeTestData = {
  source: 'TEST-DATA-NOT-FOR-PRODUCTION-HOME',
  createdToday: 12,
  pendingPayment: 4,
  confirmed: 7,
  confirmedWithBalance: 0,
  cancelled: 1,
  upcoming: 9,
  paymentsToValidate: 3,
  cashTotal: '$ 1.250.000',
} as const;

export type HomeData = typeof homeTestData;
