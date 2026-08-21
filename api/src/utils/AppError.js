// A thrown error carrying its own HTTP status and a message that's already
// safe to show a client — used by validation and anything else that wants
// the global error handler to relay its message verbatim instead of
// collapsing it to the generic 500 response (see errorHandler.middleware.js).
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
