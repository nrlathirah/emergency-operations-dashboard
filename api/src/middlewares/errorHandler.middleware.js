// Catches anything that reaches Express's error pipeline — every existing
// controller still catches and formats its own expected errors (unchanged),
// so in practice this is the safety net for: (a) genuinely unhandled bugs
// (Express 5 auto-forwards a rejected promise from any route handler here),
// and (b) unmatched routes, via notFound below. Without this, an unhandled
// error falls through to Express's own default handler, which in
// non-production mode replies with the raw error message AND stack trace —
// a real information-disclosure risk (DB column names, file paths, query
// fragments) on top of just looking broken.
export const notFound = (req, res) => {
  res.status(404).json({ message: "Not found." });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;

  // Full detail server-side always — this is the only place that sees it.
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  // err.isOperational marks a deliberately-thrown, already-client-safe
  // message (AppError, or a Sequelize validation error — see below).
  // Anything else reaching a 500 here is by definition unexpected, so its
  // raw .message (which can echo internal detail — table/column names, a
  // stray file path) never leaves the server.
  const isSafeMessage = err.isOperational || err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError";
  const message = isSafeMessage ? err.message : "Something went wrong. Please try again.";

  res.status(statusCode).json({ message });
};
