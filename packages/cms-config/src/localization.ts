import type { LocalizationConfig } from 'payload';

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const localization: LocalizationConfig = {
  locales: [...LOCALES],
  defaultLocale: 'fr',
  fallback: true,
};
