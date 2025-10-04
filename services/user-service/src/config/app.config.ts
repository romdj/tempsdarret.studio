export const appConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
  host: process.env.HOST ?? '0.0.0.0',
  env: process.env.NODE_ENV ?? 'development',
  serviceName: 'user-service'
};