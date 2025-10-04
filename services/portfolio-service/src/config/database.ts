import mongoose from 'mongoose';

class DatabaseConnection {
  async connect(options: { uri: string }): Promise<void> {
    try {
      await mongoose.connect(options.uri);
      // eslint-disable-next-line no-console
      console.log('MongoDB connected successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    // eslint-disable-next-line no-console
    console.log('MongoDB disconnected');
  }
}

export const dbConnection = new DatabaseConnection();
