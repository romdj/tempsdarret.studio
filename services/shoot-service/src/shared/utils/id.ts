import { randomBytes } from 'crypto';

export const generateId = (): string => randomBytes(16).toString('hex');

export const generateShootId = (): string => `shoot_${randomBytes(16).toString('hex')}`;
export const generateEventId = (): string => `evt_${randomBytes(16).toString('hex')}`;