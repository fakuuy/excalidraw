// MongoDB Schema for Excalidraw Backend
// Use with Mongoose or native MongoDB driver

// Users Collection
const usersSchema = {
  _id: ObjectId, // MongoDB default
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows nulls but enforces uniqueness
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  avatarUrl: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};

// Rooms Collection (Workspaces)
const roomsSchema = {
  _id: ObjectId,
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  ownerId: {
    type: ObjectId,
    ref: 'users',
    required: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  allowAnonymous: {
    type: Boolean,
    default: false
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  settings: {
    enableVoice: { type: Boolean, default: false },
    enableVideo: { type: Boolean, default: false },
    autoSave: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};

// Scenes Collection (Drawing data - perfect for MongoDB!)
const scenesSchema = {
  _id: ObjectId,
  roomId: {
    type: ObjectId,
    ref: 'rooms',
    required: true,
    unique: true // One scene per room
  },
  // Store Excalidraw data directly as JSON - MongoDB's strength!
  elements: [{
    type: Schema.Types.Mixed, // Flexible JSON structure
    required: true
  }],
  appState: {
    type: Schema.Types.Mixed // Stores app state as JSON
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  checksum: String, // For integrity checking
  updatedBy: {
    type: ObjectId,
    ref: 'users'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};

// Files Collection
const filesSchema = {
  _id: String, // Use Excalidraw's file ID
  roomId: {
    type: ObjectId,
    ref: 'rooms',
    required: true
  },
  filename: String,
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    max: 100 * 1024 * 1024 // 100MB limit
  },
  // Store as GridFS for large files, or dataURL for small ones
  dataUrl: String, // For small images
  gridFSId: ObjectId, // For large files using GridFS
  uploadedBy: {
    type: ObjectId,
    ref: 'users'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastRetrieved: {
    type: Date,
    default: Date.now
  }
};

// Room Participants Collection
const roomParticipantsSchema = {
  _id: ObjectId,
  roomId: {
    type: ObjectId,
    ref: 'rooms',
    required: true
  },
  userId: {
    type: ObjectId,
    ref: 'users' // Can be null for anonymous
  },
  username: String, // For anonymous users
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    default: 'member'
  },
  permissions: {
    canEdit: { type: Boolean, default: true },
    canExport: { type: Boolean, default: true },
    canInvite: { type: Boolean, default: false },
    canManage: { type: Boolean, default: false }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
};

// Active Sessions Collection (for real-time collaboration)
const sessionsSchema = {
  _id: ObjectId,
  socketId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: ObjectId,
    ref: 'users'
  },
  roomId: {
    type: ObjectId,
    ref: 'rooms',
    required: true
  },
  userAgent: String,
  ipAddress: String,
  // Real-time collaboration data
  presence: {
    cursor: {
      x: Number,
      y: Number
    },
    selectedElements: [String], // Array of element IDs
    viewportBounds: {
      minX: Number,
      minY: Number,
      maxX: Number,
      maxY: Number
    }
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastPing: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
};

// MongoDB Indexes for Performance
const createIndexes = async (db) => {
  // Users indexes
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });

  // Rooms indexes
  await db.collection('rooms').createIndex({ ownerId: 1 });
  await db.collection('rooms').createIndex({ isPublic: 1 });
  await db.collection('rooms').createIndex({ createdAt: -1 });

  // Scenes indexes
  await db.collection('scenes').createIndex({ roomId: 1 }, { unique: true });
  await db.collection('scenes').createIndex({ updatedAt: -1 });

  // Files indexes
  await db.collection('files').createIndex({ roomId: 1 });
  await db.collection('files').createIndex({ mimeType: 1 });
  await db.collection('files').createIndex({ createdAt: -1 });

  // Participants indexes
  await db.collection('roomParticipants').createIndex({ roomId: 1 });
  await db.collection('roomParticipants').createIndex({ userId: 1 });
  await db.collection('roomParticipants').createIndex({ roomId: 1, userId: 1 }, { unique: true });

  // Sessions indexes
  await db.collection('sessions').createIndex({ socketId: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ roomId: 1 });
  await db.collection('sessions').createIndex({ userId: 1 });
  await db.collection('sessions').createIndex({ lastPing: 1 }); // For cleanup
};

// Sample data insertion
const insertSampleData = async (db) => {
  // Create admin user
  const adminUser = await db.collection('users').insertOne({
    username: 'admin',
    email: 'admin@itica.lat',
    displayName: 'Administrator',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Create sample room
  const sampleRoom = await db.collection('rooms').insertOne({
    name: 'Sample Workspace',
    ownerId: adminUser.insertedId,
    description: 'A sample workspace for testing',
    isPublic: true,
    allowAnonymous: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('✅ Sample data inserted');
  console.log(`Admin User ID: ${adminUser.insertedId}`);
  console.log(`Sample Room ID: ${sampleRoom.insertedId}`);
};

// MongoDB Connection and Setup
const setupMongoDB = async () => {
  const { MongoClient } = require('mongodb');

  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/excalidraw');
  await client.connect();

  const db = client.db();

  // Create indexes
  await createIndexes(db);
  console.log('✅ MongoDB indexes created');

  // Insert sample data (optional)
  await insertSampleData(db);

  await client.close();
  console.log('✅ MongoDB setup completed');
};

// Export for use in your application
module.exports = {
  usersSchema,
  roomsSchema,
  scenesSchema,
  filesSchema,
  roomParticipantsSchema,
  sessionsSchema,
  createIndexes,
  insertSampleData,
  setupMongoDB
};

// If running directly
if (require.main === module) {
  setupMongoDB().catch(console.error);
}