/**
 * MongoDB Mock for Testing
 * Provides mock implementation of MongoDB operations for testing
 */

import { vi } from 'vitest';

class MockCollection {
  private data: Map<string, any> = new Map();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  insertOne = vi.fn(async (doc: any) => {
    const id = doc._id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertedDoc = { _id: id, ...doc };
    this.data.set(id, insertedDoc);
    return { insertedId: id, acknowledged: true };
  });

  insertMany = vi.fn(async (docs: any[]) => {
    const insertedIds: string[] = [];
    docs.forEach((doc, index) => {
      const id = doc._id || `mock_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      const insertedDoc = { _id: id, ...doc };
      this.data.set(id, insertedDoc);
      insertedIds.push(id);
    });
    return { insertedIds, acknowledged: true };
  });

  findOne = vi.fn(async (filter: any = {}) => {
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        return doc;
      }
    }
    return null;
  });

  find = vi.fn((filter: any = {}) => ({
    toArray: async () => {
      const results: any[] = [];
      for (const [id, doc] of this.data.entries()) {
        if (this.matchesFilter(doc, filter)) {
          results.push(doc);
        }
      }
      return results;
    },
    limit: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
  }));

  updateOne = vi.fn(async (filter: any, update: any) => {
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        const updatedDoc = { ...doc, ...update.$set };
        this.data.set(id, updatedDoc);
        return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
      }
    }
    return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
  });

  updateMany = vi.fn(async (filter: any, update: any) => {
    let matchedCount = 0;
    let modifiedCount = 0;
    
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        matchedCount++;
        const updatedDoc = { ...doc, ...update.$set };
        this.data.set(id, updatedDoc);
        modifiedCount++;
      }
    }
    
    return { matchedCount, modifiedCount, acknowledged: true };
  });

  deleteOne = vi.fn(async (filter: any) => {
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        this.data.delete(id);
        return { deletedCount: 1, acknowledged: true };
      }
    }
    return { deletedCount: 0, acknowledged: true };
  });

  deleteMany = vi.fn(async (filter: any = {}) => {
    let deletedCount = 0;
    const toDelete: string[] = [];
    
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        toDelete.push(id);
        deletedCount++;
      }
    }
    
    toDelete.forEach(id => this.data.delete(id));
    return { deletedCount, acknowledged: true };
  });

  countDocuments = vi.fn(async (filter: any = {}) => {
    let count = 0;
    for (const [id, doc] of this.data.entries()) {
      if (this.matchesFilter(doc, filter)) {
        count++;
      }
    }
    return count;
  });

  createIndex = vi.fn(async () => ({ acknowledged: true }));
  dropIndex = vi.fn(async () => ({ acknowledged: true }));

  // Helper methods
  private matchesFilter(doc: any, filter: any): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    
    return Object.entries(filter).every(([key, value]) => {
      if (key === '_id' && typeof value === 'string') {
        return doc._id === value;
      }
      return doc[key] === value;
    });
  }

  // Test utilities
  clear() {
    this.data.clear();
  }

  getAll() {
    return Array.from(this.data.values());
  }

  getById(id: string) {
    return this.data.get(id);
  }

  size() {
    return this.data.size;
  }
}

class MockDatabase {
  private collections: Map<string, MockCollection> = new Map();
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  collection(name: string): MockCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name)!;
  }

  // Test utilities
  getCollection(name: string): MockCollection {
    return this.collection(name);
  }

  clearAll() {
    this.collections.forEach(collection => collection.clear());
  }

  getAllCollections() {
    return Array.from(this.collections.keys());
  }
}

class MockMongoClient {
  private databases: Map<string, MockDatabase> = new Map();
  private connected = false;

  connect = vi.fn(async () => {
    this.connected = true;
    return this;
  });

  close = vi.fn(async () => {
    this.connected = false;
  });

  db(name: string = 'test'): MockDatabase {
    if (!this.databases.has(name)) {
      this.databases.set(name, new MockDatabase(name));
    }
    return this.databases.get(name)!;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Test utilities
  reset() {
    this.databases.clear();
    this.connected = false;
    vi.clearAllMocks();
  }

  clearAllDatabases() {
    this.databases.forEach(db => db.clearAll());
  }

  getAllDatabases() {
    return Array.from(this.databases.keys());
  }
}

// Export singleton mock instance
export const mockMongoClient = new MockMongoClient();

// Mock MongoDB module
export const mockMongoDB = {
  MongoClient: vi.fn(() => mockMongoClient),
  ObjectId: vi.fn((id?: string) => ({
    toString: () => id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    toHexString: () => id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  })),
};

// Setup helper
export const setupMongoMock = {
  reset: () => mockMongoClient.reset(),
  getInstance: () => mockMongoClient,
  getDatabase: (name: string = 'test') => mockMongoClient.db(name),
  getCollection: (dbName: string = 'test', collectionName: string) => 
    mockMongoClient.db(dbName).collection(collectionName),
  
  // Data seeding helpers
  seedData: async (dbName: string, collectionName: string, documents: any[]) => {
    const collection = mockMongoClient.db(dbName).collection(collectionName);
    await collection.insertMany(documents);
  },
  
  clearCollection: (dbName: string, collectionName: string) => {
    const collection = mockMongoClient.db(dbName).collection(collectionName);
    collection.clear();
  },
};