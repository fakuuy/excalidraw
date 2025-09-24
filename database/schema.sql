-- Database schema for Excalidraw custom backend
-- Compatible with PostgreSQL/MySQL

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Additional fields you might want
    display_name VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,

    -- Indexes for performance
    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
);

-- Rooms table (workspaces)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Room settings
    is_public BOOLEAN DEFAULT false,
    description TEXT,
    max_participants INTEGER DEFAULT 100,

    -- Room permissions
    allow_anonymous BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,

    -- Foreign key
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_rooms_owner (owner_id),
    INDEX idx_rooms_public (is_public),
    INDEX idx_rooms_created (created_at)
);

-- Room participants (for access control)
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    user_id UUID,  -- NULL for anonymous users
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Participant info
    username VARCHAR(255), -- For anonymous users
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',

    -- Permissions
    can_edit BOOLEAN DEFAULT true,
    can_export BOOLEAN DEFAULT true,
    can_invite BOOLEAN DEFAULT false,

    -- Foreign keys
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    -- Unique constraint for registered users
    UNIQUE KEY unique_user_room (room_id, user_id),

    -- Indexes
    INDEX idx_participants_room (room_id),
    INDEX idx_participants_user (user_id)
);

-- Scenes table (drawing data)
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID UNIQUE NOT NULL, -- One scene per room

    -- Scene data (stored as JSON)
    elements JSON NOT NULL,
    app_state JSON,

    -- Version control
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    updated_by UUID, -- Last user who updated
    checksum VARCHAR(64), -- For integrity checking

    -- Foreign keys
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_scenes_room (room_id),
    INDEX idx_scenes_updated (updated_at)
);

-- Files table (images, assets)
CREATE TABLE files (
    id UUID PRIMARY KEY, -- Use the same ID as in Excalidraw
    room_id UUID NOT NULL,

    -- File metadata
    filename VARCHAR(255),
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,

    -- File data
    data_url LONGTEXT NOT NULL, -- Base64 encoded data URL

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_retrieved TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    uploaded_by UUID,
    checksum VARCHAR(64),

    -- Foreign keys
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_files_room (room_id),
    INDEX idx_files_type (mime_type)
);

-- Sessions table (for WebSocket management)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    room_id UUID NOT NULL,

    -- Session info
    socket_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,

    -- Status
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    -- User presence data
    cursor_position JSON,
    selected_elements JSON,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_sessions_room (room_id),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_socket (socket_id)
);

-- Room invites table (optional)
CREATE TABLE room_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    inviter_id UUID NOT NULL,

    -- Invite details
    email VARCHAR(255),
    invite_token VARCHAR(255) UNIQUE NOT NULL,

    -- Settings
    expires_at TIMESTAMP,
    max_uses INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,

    -- Status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,

    -- Foreign keys
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_invites_room (room_id),
    INDEX idx_invites_token (invite_token)
);

-- Create triggers for updated_at timestamps (PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial data
INSERT INTO users (id, username, email, display_name) VALUES
('00000000-0000-0000-0000-000000000001', 'admin', 'admin@itica.lat', 'Administrator')
ON CONFLICT DO NOTHING;