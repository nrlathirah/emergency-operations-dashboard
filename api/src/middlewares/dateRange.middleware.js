import { AppError } from "#utils/AppError.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// The trend reports build one bucket per day between startDate and endDate,
// so an absurd range (year 0001 → 9999 is ~3.6 million days) would tie up
// the single free-tier server for everyone. 10 years is far beyond anything
// the date picker produces, while keeping that loop trivially small.
const MAX_RANGE_DAYS = 3660;

// Applied to every /api/reports route. Rejects only genuinely bad input —
// a missing date (or only one of the two) is still valid and just means
// "no date filter", exactly as before.
export const validateDateRangeQuery = (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (startDate === undefined && endDate === undefined) return next();

  for (const value of [startDate, endDate]) {
    if (value !== undefined && (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))) {
      return next(new AppError("Invalid date.", 400));
    }
  }

  if (startDate && endDate) {
    const spanDays = Math.abs(new Date(endDate) - new Date(startDate)) / DAY_MS;
    if (spanDays > MAX_RANGE_DAYS) {
      return next(new AppError("Date range is too large — please pick 10 years or less.", 400));
    }
  }
  next();
};
