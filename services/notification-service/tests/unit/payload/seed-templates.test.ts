import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface CreateArgs {
  collection: string;
  data: Record<string, any>;
}

const cms = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  getPayload: vi.fn(),
}));

vi.mock('payload', () => ({ getPayload: cms.getPayload }));
vi.mock('../../../src/payload/payload.config.js', () => ({ default: { secret: 'seed-test' } }));

// This is a standalone script with top-level await. Resetting modules lets each
// test exercise its real entry point, with only the external CMS boundary mocked.
const runSeed = () => import('../../../src/payload/seed-templates.js');

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  cms.getPayload.mockResolvedValue(cms);
  cms.find.mockResolvedValue({ docs: [] });
  cms.create.mockResolvedValue({ id: 'created' });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('notification template seed script', () => {
  it('initializes Payload and creates usable email templates and their variable definitions', async () => {
    await runSeed();

    expect(cms.getPayload).toHaveBeenCalledWith({ config: { secret: 'seed-test' } });
    expect(cms.find).toHaveBeenCalledWith({ collection: 'notification-templates', limit: 1 });
    const writes = cms.create.mock.calls.map(([args]) => args as CreateArgs);
    const templates = writes.filter(({ collection }) => collection === 'notification-templates');
    const variables = writes.filter(({ collection }) => collection === 'template-variables');
    expect(templates.map(({ data }) => data.type)).toEqual(['magic-link', 'photos-ready', 'shoot-update']);
    for (const { data } of templates) {
      expect(data).toMatchObject({ channel: 'email', language: 'en', isActive: true });
      expect(data.templates.subject).toContain('{{eventName}}');
      expect(data.templates.text).toContain('{{clientName}}');
      expect(data.templates.html).toContain('{{clientName}}');
      expect(data.variables).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'clientName', required: true }),
      ]));
    }
    expect(variables.map(({ data }) => data.name)).toEqual([
      'clientName', 'eventName', 'photographerName', 'photographerEmail',
      'magicLinkUrl', 'expirationDate', 'eventDate', 'eventLocation', 'totalPhotoCount', 'galleryUrl',
    ]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not overwrite templates or create variables when templates already exist', async () => {
    cms.find.mockResolvedValue({ docs: [{ id: 'existing' }] });
    await runSeed();
    expect(cms.create).not.toHaveBeenCalled();
  });

  it('propagates initialization failure without attempting any writes', async () => {
    const failure = new Error('CMS unavailable');
    cms.getPayload.mockRejectedValue(failure);
    await expect(runSeed()).rejects.toBe(failure);
    expect(cms.find).not.toHaveBeenCalled();
    expect(cms.create).not.toHaveBeenCalled();
  });

  it('reports and propagates a failed lookup without writing templates', async () => {
    const failure = new Error('Database lookup failed');
    cms.find.mockRejectedValue(failure);
    await expect(runSeed()).rejects.toBe(failure);
    expect(cms.create).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('❌ Failed to seed templates:', failure);
  });

  it('stops and propagates a failed template write before seeding variables', async () => {
    const failure = new Error('Template validation failed');
    cms.create.mockRejectedValueOnce(failure);
    await expect(runSeed()).rejects.toBe(failure);
    expect(cms.create).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('❌ Failed to seed templates:', failure);
  });

  it.each([new Error('duplicate key'), 'duplicate key'])('skips duplicate variables and continues seeding: %s', async (failure) => {
    cms.create.mockImplementation(async ({ collection, data }: CreateArgs) => {
      if (collection === 'template-variables' && data.name === 'clientName') throw failure;
      return { id: data.name };
    });
    await runSeed();
    expect(cms.create).toHaveBeenLastCalledWith(expect.objectContaining({
      collection: 'template-variables', data: expect.objectContaining({ name: 'galleryUrl' }),
    }));
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each([new Error('Write denied'), 'Write denied'])('reports other variable failures and continues: %s', async (failure) => {
    cms.create.mockImplementation(async ({ collection, data }: CreateArgs) => {
      if (collection === 'template-variables' && data.name === 'clientName') throw failure;
      return { id: data.name };
    });
    await runSeed();
    expect(console.error).toHaveBeenCalledWith('Failed to create variable clientName:', failure);
    expect(cms.create).toHaveBeenLastCalledWith(expect.objectContaining({
      collection: 'template-variables', data: expect.objectContaining({ name: 'galleryUrl' }),
    }));
  });
});
