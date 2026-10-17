// Version of the terms of use and privacy policy. Change it (to the new "last updated" date)
// whenever the legal text changes in a way users must accept again: every account is then asked
// to read and accept the new version on its next visit.
export const TERMS_VERSION = "2026-10-17.2"; // .2: prohibited goods and document review

export const termsOutdated = (user) =>
  !!user && user.role !== "admin" && !user.demo && user.termsVersion !== TERMS_VERSION;

// Version of the distance sales / refund terms accepted with each online payment.
export const SALES_TERMS_VERSION = "2026-10-17";
