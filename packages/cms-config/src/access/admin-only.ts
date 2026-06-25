import type { Access } from 'payload';

export const adminOnly: Access = ({ req }) => Boolean(req.user);
