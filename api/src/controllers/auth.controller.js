import { login as loginService } from "#services/auth.service.js";

export const login = async (req, res, next) => {
  try {
    const result = await loginService({ email: req.body.email, password: req.body.password });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
