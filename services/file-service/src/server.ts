/**
 * File Service HTTP Server Factory
 *
 * Builds the Fastify instance (no DB/Kafka/listen side effects) so it can be
 * imported and injected by tests, mirroring the sibling services' `createServer`.
 */

import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export async function createServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024 * 1024, // 1GB for large file uploads
  });

  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024, // 1MB for form fields
      fields: 10,
      fileSize: 1024 * 1024 * 1024, // 1GB for files
      files: 10,
    },
  });

  return fastify;
}
