import mongoose from 'mongoose';

export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection | undefined;
  private isConnected = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): DatabaseConnection {
    DatabaseConnection.instance ??= new DatabaseConnection();
    return DatabaseConnection.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      // eslint-disable-next-line no-console
      console.log('Database already connected');
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      };

      await mongoose.connect(config.uri, {
        ...defaultOptions,
        ...config.options
      });

      this.isConnected = true;
      // eslint-disable-next-line no-console
      console.log('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        // eslint-disable-next-line no-console
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        // eslint-disable-next-line no-console
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        // eslint-disable-next-line no-console
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      // eslint-disable-next-line no-console
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionState(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const dbConnection = DatabaseConnection.getInstance();