export const appConfig = {
  serviceName: 'portfolio-service',
  port: parseInt(process.env.PORT ?? '3005', 10),
  host: process.env.HOST ?? '0.0.0.0',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/tempsdarret-portfolios',
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
  nodeEnv: process.env.NODE_ENV ?? 'development'
};
