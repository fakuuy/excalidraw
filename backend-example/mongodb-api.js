// Example MongoDB Backend API for Excalidraw
// Node.js + Express + MongoDB implementation

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://excalidraw.faku.pro',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// MongoDB Connection with better error handling
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/excalidraw';
    console.log('🔗 Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***:***@'));

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String, required: true },
  displayName: { type: String, trim: true },
  avatarUrl: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, maxlength: 1000 },
  isPublic: { type: Boolean, default: false },
  allowAnonymous: { type: Boolean, default: false },
  maxParticipants: { type: Number, default: 100 },
  settings: {
    enableVoice: { type: Boolean, default: false },
    enableVideo: { type: Boolean, default: false },
    autoSave: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  }
}, { timestamps: true });

const sceneSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, unique: true },
  elements: [{ type: mongoose.Schema.Types.Mixed }],
  appState: { type: mongoose.Schema.Types.Mixed },
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const fileSchema = new mongoose.Schema({
  _id: { type: String }, // Use Excalidraw's file ID
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  filename: String,
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  dataUrl: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastRetrieved: { type: Date, default: Date.now }
}, { timestamps: true });

// Models
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Scene = mongoose.model('Scene', sceneSchema);
const File = mongoose.model('File', fileSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Helper function to check room access
const checkRoomAccess = async (userId, roomId) => {
  const room = await Room.findById(roomId);
  if (!room) return false;

  return room.isPublic || room.ownerId.toString() === userId;
};

// AUTHENTICATION ROUTES

// Register
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 2-50 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, ...(email ? [{ email }] : [])]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// ROOM MANAGEMENT ROUTES

// Get user's rooms
app.get('/api/rooms/my-rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { ownerId: req.user.userId },
        { isPublic: true, allowAnonymous: true }
      ]
    }).populate('ownerId', 'username displayName').sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Create room (FREE for everyone!)
app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic, allowAnonymous, maxParticipants = 100 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name required' });
    }

    const room = new Room({
      name: name.trim(),
      description,
      ownerId: req.user.userId,
      isPublic: !!isPublic,
      allowAnonymous: !!allowAnonymous,
      maxParticipants: Math.min(maxParticipants, 1000) // Cap at 1000
    });

    await room.save();
    await room.populate('ownerId', 'username displayName');

    res.status(201).json(room);
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room
app.get('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('ownerId', 'username displayName');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check access
    if (!await checkRoomAccess(req.user.userId, req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Delete room
app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner can delete
    if (room.ownerId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only room owner can delete' });
    }

    // Delete related data
    await Scene.deleteOne({ roomId: req.params.id });
    await File.deleteMany({ roomId: req.params.id });
    await Room.findByIdAndDelete(req.params.id);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// SCENE MANAGEMENT ROUTES

// Save scene
app.put('/api/rooms/:id/scene', authenticateToken, async (req, res) => {
  try {
    const { elements, appState, version } = req.body;

    // Check room access
    if (!await checkRoomAccess(req.user.userId, req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sceneData = {
      roomId: req.params.id,
      elements: elements || [],
      appState: appState || {},
      version: version || 1,
      updatedBy: req.user.userId
    };

    // Upsert scene
    await Scene.findOneAndUpdate(
      { roomId: req.params.id },
      sceneData,
      { upsert: true, new: true }
    );

    res.json({ message: 'Scene saved successfully' });
  } catch (error) {
    console.error('Scene save error:', error);
    res.status(500).json({ error: 'Failed to save scene' });
  }
});

// Load scene
app.get('/api/rooms/:id/scene', authenticateToken, async (req, res) => {
  try {
    // Check room access
    if (!await checkRoomAccess(req.user.userId, req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scene = await Scene.findOne({ roomId: req.params.id })
      .populate('updatedBy', 'username displayName');

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    res.json(scene);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load scene' });
  }
});

// FILE MANAGEMENT ROUTES

// Upload file
app.post('/api/rooms/:id/files', authenticateToken, async (req, res) => {
  try {
    const { file_id, mime_type, data, filename } = req.body;

    // Check room access
    if (!await checkRoomAccess(req.user.userId, req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate file size (100MB limit)
    const fileSize = Buffer.byteLength(data, 'base64');
    if (fileSize > 100 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 100MB)' });
    }

    const file = new File({
      _id: file_id,
      roomId: req.params.id,
      filename,
      mimeType: mime_type,
      fileSize,
      dataUrl: data,
      uploadedBy: req.user.userId
    });

    await file.save();
    res.json({ message: 'File uploaded successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'File already exists' });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file
app.get('/api/rooms/:id/files/:fileId', authenticateToken, async (req, res) => {
  try {
    // Check room access
    if (!await checkRoomAccess(req.user.userId, req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const file = await File.findOne({
      _id: req.params.fileId,
      roomId: req.params.id
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update last retrieved
    file.lastRetrieved = new Date();
    await file.save();

    res.json({
      id: file._id,
      mimeType: file.mimeType,
      dataURL: file.dataUrl,
      created: file.createdAt.getTime(),
      lastRetrieved: file.lastRetrieved.getTime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      collaboration: true,
      workspaces: true,
      fileUploads: true,
      unlimitedRooms: true,
      freeTier: true
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Excalidraw API server...');
console.log('📋 Environment check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   PORT: ${PORT}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***configured***' : 'NOT SET'}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '***configured***' : 'NOT SET'}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 Excalidraw API server running on port ${PORT}`);
  console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'https://excalidraw.faku.pro'}`);
  console.log(`📊 MongoDB: Connected`);
  console.log(`✅ All features enabled for FREE!`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});