import type { Access } from 'payload';

export const publishedOrAdmin: Access = ({ req }) => {
  if (req.user) return true;
  return { _status: { equals: 'published' } };
};
