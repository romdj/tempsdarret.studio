export const appConfig = {
  port: process.env['PORT'] ? parseInt(process.env['PORT']) : 3001,
  kafkaBrokers: process.env['KAFKA_BROKERS']?.split(',') || ['localhost:9093'],
  nodeEnv: process.env['NODE_ENV'] || 'development',
};