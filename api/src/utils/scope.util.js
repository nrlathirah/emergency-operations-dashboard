export const getScopedAgency = (req) => {
  if (req.user.role === "super_admin") {
    return req.query.agency; // unrestricted — can filter by any agency or none
  }
  return req.user.agencyCode; // forced to their own agency, query param ignored
};
