// MongoDB initialization script for Docker
// This script runs when MongoDB container starts for the first time

print('🚀 Initializing Excalidraw MongoDB database...');

// Switch to excalidraw database
db = db.getSiblingDB('excalidraw');

// Create collections with validation
db.createCollection('users', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["username"],
         properties: {
            username: {
               bsonType: "string",
               description: "Username is required and must be a string"
            },
            email: {
               bsonType: ["string", "null"],
               pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
               description: "Email must be a valid email address"
            },
            displayName: {
               bsonType: ["string", "null"],
               description: "Display name must be a string"
            }
         }
      }
   }
});

db.createCollection('rooms', {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["name", "ownerId"],
         properties: {
            name: {
               bsonType: "string",
               description: "Room name is required"
            },
            ownerId: {
               bsonType: "objectId",
               description: "Owner ID must be a valid ObjectId"
            },
            maxParticipants: {
               bsonType: "int",
               minimum: 1,
               maximum: 1000,
               description: "Max participants must be between 1 and 1000"
            }
         }
      }
   }
});

db.createCollection('scenes');
db.createCollection('files');
db.createCollection('roomParticipants');
db.createCollection('sessions');

// Create indexes for performance
print('📊 Creating database indexes...');

// Users indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "createdAt": -1 });

// Rooms indexes
db.rooms.createIndex({ "ownerId": 1 });
db.rooms.createIndex({ "isPublic": 1 });
db.rooms.createIndex({ "createdAt": -1 });
db.rooms.createIndex({ "name": "text", "description": "text" }); // Text search

// Scenes indexes
db.scenes.createIndex({ "roomId": 1 }, { unique: true });
db.scenes.createIndex({ "updatedAt": -1 });
db.scenes.createIndex({ "updatedBy": 1 });

// Files indexes
db.files.createIndex({ "roomId": 1 });
db.files.createIndex({ "mimeType": 1 });
db.files.createIndex({ "createdAt": -1 });

// Room participants indexes
db.roomParticipants.createIndex({ "roomId": 1 });
db.roomParticipants.createIndex({ "userId": 1 });
db.roomParticipants.createIndex({ "roomId": 1, "userId": 1 }, { unique: true });

// Sessions indexes
db.sessions.createIndex({ "socketId": 1 }, { unique: true });
db.sessions.createIndex({ "roomId": 1 });
db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "lastPing": 1 }); // For cleanup
db.sessions.createIndex({ "connectedAt": 1 });

// Insert sample admin user
print('👤 Creating admin user...');

const adminUser = {
   username: "admin",
   email: "admin@itica.lat",
   displayName: "Administrator",
   password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsYN1y8DG", // hashed "admin123"
   isActive: true,
   createdAt: new Date(),
   updatedAt: new Date()
};

try {
   db.users.insertOne(adminUser);
   print('✅ Admin user created successfully');
} catch (error) {
   if (error.code === 11000) {
      print('ℹ️  Admin user already exists, skipping creation');
   } else {
      print('❌ Error creating admin user: ' + error.message);
   }
}

// Create sample public room
print('🏠 Creating sample room...');

const adminUserDoc = db.users.findOne({ username: "admin" });
if (adminUserDoc) {
   const sampleRoom = {
      name: "Welcome to Excalidraw",
      description: "A sample workspace to get you started",
      ownerId: adminUserDoc._id,
      isPublic: true,
      allowAnonymous: true,
      requireApproval: false,
      maxParticipants: 100,
      settings: {
         enableVoice: false,
         enableVideo: false,
         autoSave: true,
         theme: "light"
      },
      createdAt: new Date(),
      updatedAt: new Date()
   };

   try {
      const roomResult = db.rooms.insertOne(sampleRoom);
      print('✅ Sample room created with ID: ' + roomResult.insertedId);

      // Create a sample scene for the room
      const sampleScene = {
         roomId: roomResult.insertedId,
         elements: [
            {
               id: "welcome-text",
               type: "text",
               x: 100,
               y: 100,
               width: 400,
               height: 50,
               text: "¡Bienvenido a Excalidraw ITICA!\n\nTodas las funciones están disponibles GRATIS",
               fontSize: 20,
               fontFamily: 1,
               textAlign: "center",
               verticalAlign: "middle",
               strokeColor: "#1e1e1e",
               backgroundColor: "transparent",
               fillStyle: "solid",
               strokeWidth: 1,
               strokeStyle: "solid",
               roughness: 1,
               opacity: 100
            }
         ],
         appState: {
            viewBackgroundColor: "#ffffff",
            gridSize: null,
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 }
         },
         version: 1,
         updatedBy: adminUserDoc._id,
         createdAt: new Date(),
         updatedAt: new Date()
      };

      db.scenes.insertOne(sampleScene);
      print('✅ Sample scene created for welcome room');

   } catch (error) {
      print('ℹ️  Sample room might already exist, skipping creation');
   }
} else {
   print('⚠️  Admin user not found, skipping sample room creation');
}

// Create TTL index for sessions cleanup (expire after 1 day of inactivity)
db.sessions.createIndex({ "lastPing": 1 }, { expireAfterSeconds: 86400 });

// Database statistics
print('📈 Database setup complete! Statistics:');
print('- Users collection: ' + db.users.countDocuments());
print('- Rooms collection: ' + db.rooms.countDocuments());
print('- Scenes collection: ' + db.scenes.countDocuments());
print('- Files collection: ' + db.files.countDocuments());

print('🎉 Excalidraw MongoDB initialization completed successfully!');
print('🔗 Ready for connections at: mongodb://localhost:27017/excalidraw');
print('👤 Admin credentials: admin / admin123');
print('');
print('=== FEATURES ENABLED ===');
print('✅ Unlimited workspaces');
print('✅ Real-time collaboration');
print('✅ File uploads (100MB limit)');
print('✅ All export formats');
print('✅ No payment restrictions');
print('=====================================');