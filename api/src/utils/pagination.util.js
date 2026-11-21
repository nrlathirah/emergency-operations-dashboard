// Every paginated endpoint reads ?page/&limit the same way — clamped here so
// a hand-crafted request can't ask for limit=10000000 (one huge query and
// response) or a negative page (a negative OFFSET, which is a SQL error).
// The UI never asks for more than 50 per page, so MAX_LIMIT is never hit by
// normal use.
const MAX_LIMIT = 100;

export const parsePagination = (query, defaultLimit = 10) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit };
};
