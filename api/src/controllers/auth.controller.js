import { login as loginService } from "#services/auth.service.js";
import { createPasswordResetRequest } from "#services/passwordResetRequest.service.js";

export const login = async (req, res, next) => {
  try {
    const result = await loginService({ email: req.body.email, password: req.body.password });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// Public, unauthenticated (that's the point — the user forgot their
// password). Always returns the same generic response regardless of
// whether the email matched anything, so this can't be used to probe for
// registered accounts.
export const requestPasswordReset = async (req, res, next) => {
  try {
    await createPasswordResetRequest({ email: req.body.email });
  } catch (error) {
    // Swallow — the response must stay generic either way.
  }
  res.status(200).json({
    message:
      "If that email is registered, your request has been noted (or you already have one pending) — an admin will review it soon. No need to submit again.",
  });
};
