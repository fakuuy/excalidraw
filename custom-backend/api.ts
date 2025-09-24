// Custom Backend API to replace Firebase - MongoDB Version
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFileData } from "@excalidraw/excalidraw/types";

// Configuration - replace with your actual API endpoints
const API_BASE_URL = process.env.VITE_API_BASE_URL || "https://api.itica.lat";

export interface CustomUser {
  _id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomRoom {
  _id: string;
  name: string;
  ownerId: string;
  description?: string;
  isPublic: boolean;
  allowAnonymous: boolean;
  requireApproval: boolean;
  maxParticipants: number;
  settings: {
    enableVoice: boolean;
    enableVideo: boolean;
    autoSave: boolean;
    theme: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomScene {
  _id: string;
  roomId: string;
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  version: number;
  checksum?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Client
class CustomBackendAPI {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // User Management
  async registerUser(username: string, email?: string): Promise<CustomUser> {
    return this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email }),
    });
  }

  async getUserProfile(): Promise<CustomUser> {
    return this.request('/users/me');
  }

  async updateUsername(username: string): Promise<void> {
    await this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
  }

  // Room Management (FREE for everyone)
  async createRoom(name: string, isPublic: boolean = false): Promise<CustomRoom> {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, is_public: isPublic }),
    });
  }

  async getUserRooms(): Promise<CustomRoom[]> {
    return this.request('/rooms/my-rooms');
  }

  async getRoom(roomId: string): Promise<CustomRoom> {
    return this.request(`/rooms/${roomId}`);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.request(`/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  // Scene Management (replaces Firebase)
  async saveScene(roomId: string, scene: Omit<CustomScene, 'room_id' | 'updated_at'>): Promise<void> {
    await this.request(`/rooms/${roomId}/scene`, {
      method: 'PUT',
      body: JSON.stringify(scene),
    });
  }

  async loadScene(roomId: string): Promise<CustomScene | null> {
    try {
      return await this.request(`/rooms/${roomId}/scene`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Scene doesn't exist yet
      }
      throw error;
    }
  }

  // File Management
  async uploadFile(roomId: string, fileId: string, fileData: BinaryFileData): Promise<void> {
    const formData = new FormData();
    formData.append('file_id', fileId);
    formData.append('mime_type', fileData.mimeType);
    formData.append('data', fileData.dataURL);

    await this.request(`/rooms/${roomId}/files`, {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type to let browser set boundary for FormData
    });
  }

  async getFile(roomId: string, fileId: string): Promise<BinaryFileData | null> {
    try {
      return await this.request(`/rooms/${roomId}/files/${fileId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Authentication
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Singleton instance
export const customAPI = new CustomBackendAPI();

// Utility functions to replace Firebase functions
export const isLoggedIn = () => customAPI.isAuthenticated();

export const getCurrentUser = async (): Promise<CustomUser | null> => {
  if (!isLoggedIn()) {
    return null;
  }
  try {
    return await customAPI.getUserProfile();
  } catch {
    return null;
  }
};

// Migration helpers
export const migrateFromFirebase = {
  // Helper to convert Firebase user data to our format
  convertUser: (firebaseUser: any): CustomUser => ({
    id: firebaseUser.uid,
    username: firebaseUser.displayName || 'User',
    email: firebaseUser.email,
    created_at: new Date(firebaseUser.metadata.creationTime),
  }),

  // Helper to convert Firebase room data
  convertRoom: (firebaseData: any, roomId: string): CustomRoom => ({
    id: roomId,
    name: firebaseData.name || 'Untitled Room',
    owner_id: firebaseData.owner_id,
    created_at: new Date(firebaseData.created_at),
    updated_at: new Date(firebaseData.updated_at),
    is_public: firebaseData.is_public || false,
  }),
};