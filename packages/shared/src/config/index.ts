export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly name: string;
  readonly username?: string | undefined;
  readonly password?: string | undefined;
}

export interface KafkaConfig {
  readonly brokers: readonly string[];
  readonly clientId: string;
  readonly groupId: string;
}

export interface AuthConfig {
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly magicLinkSecret: string;
  readonly magicLinkExpiresIn: string;
}

export interface AppConfig {
  readonly env: 'development' | 'production' | 'test';
  readonly port: number;
  readonly cors: {
    readonly origin: readonly string[];
    readonly credentials: boolean;
  };
  readonly database: DatabaseConfig;
  readonly kafka: KafkaConfig;
  readonly auth: AuthConfig;
}

export const getConfig = (): AppConfig => {
  const env = (process.env['NODE_ENV'] ?? 'development') as 'development' | 'production' | 'test';
  
  return {
    env,
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    cors: {
      origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:5173'],
      credentials: true,
    },
    database: {
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '27017', 10),
      name: process.env['DB_NAME'] ?? 'tempsdarret',
      username: process.env['DB_USERNAME'],
      password: process.env['DB_PASSWORD'],
    },
    kafka: {
      brokers: process.env['KAFKA_BROKERS']?.split(',') ?? ['localhost:9092'],
      clientId: process.env['KAFKA_CLIENT_ID'] ?? 'tempsdarret-studio',
      groupId: process.env['KAFKA_GROUP_ID'] ?? 'tempsdarret-studio-group',
    },
    auth: {
      jwtSecret: process.env['JWT_SECRET'] ?? 'dev-jwt-secret',
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
      magicLinkSecret: process.env['MAGIC_LINK_SECRET'] ?? 'dev-magic-link-secret',
      magicLinkExpiresIn: process.env['MAGIC_LINK_EXPIRES_IN'] ?? '1h',
    },
  };
};