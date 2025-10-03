import { randomBytes } from 'crypto';

export function generatePortfolioId(): string {
  return `pf-${randomBytes(8).toString('hex')}`;
}

export function generateGalleryId(): string {
  return `gal-${randomBytes(8).toString('hex')}`;
}

export function generateGalleryImageId(): string {
  return `img-${randomBytes(8).toString('hex')}`;
}
