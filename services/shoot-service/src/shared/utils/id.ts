import { randomUUID } from 'crypto';

export const generateId = (): string => randomUUID();

export const generateShootId = (): string => `shoot_${randomUUID()}`;
export const generateEventId = (): string => `evt_${randomUUID()}`;