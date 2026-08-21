// Every date shown anywhere in the app used "en-MY" and one of these two
// shapes — this used to be re-typed per component (day/month/year/hour/
// minute spelled out identically in half a dozen files). One shared pair
// here instead; `includeYear` covers the one real variation between call
// sites (a table showing only recent activity doesn't need the year
// repeated on every row; an export footer or a multi-year list does).
const LOCALE = "en-MY";

// Date + time, e.g. "21 Aug 2026, 4:12 pm" (or "21 Aug, 4:12 pm" with
// includeYear: false).
export const formatDateTime = (value, { includeYear = true } = {}) => {
  if (!value) return null;
  return new Date(value).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Date only, e.g. "21 Aug" (or "21 Aug 2026" with includeYear: true). A
// bare "YYYY-MM-DD" string parses as UTC midnight in JS, which can render
// as the previous day in a negative-UTC-offset timezone — callers passing
// one of those should suffix it themselves (`${dateStr}T00:00:00`) before
// calling in, so it parses as local midnight instead; this function just
// formats whatever Date-parseable value it's given.
export const formatDate = (value, { includeYear = false } = {}) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
};
