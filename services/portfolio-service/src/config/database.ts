import mongoose from 'mongoose';

class DatabaseConnection {
  async connect(options: { uri: string }) {
    try {
      await mongoose.connect(options.uri);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

export const dbConnection = new DatabaseConnection();
