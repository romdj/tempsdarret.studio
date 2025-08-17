import mongoose from 'mongoose';

export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      };

      await mongoose.connect(config.uri, {
        ...defaultOptions,
        ...config.options
      });

      this.isConnected = true;
      console.log('MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
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
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionState(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const dbConnection = DatabaseConnection.getInstance();