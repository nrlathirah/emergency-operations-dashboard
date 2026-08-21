import { AppError } from "#utils/AppError.js";

// A body that fails schema validation is a client mistake, not a server
// bug — it always becomes a 400 with the first (most relevant) issue's
// message, via AppError so errorHandler.middleware.js relays it verbatim
// instead of collapsing it to the generic 500 message.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || "Invalid request.";
    return next(new AppError(message, 400));
  }
  req.body = result.data;
  next();
};
