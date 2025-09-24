// Custom MongoDB Backend Integration
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import { restore } from "@excalidraw/excalidraw/data/restore";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import { t } from "@excalidraw/excalidraw/i18n";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://excalidraw.faku.pro/api";

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

  // Authentication
  async registerUser(username: string, email?: string, password?: string): Promise<{ user: CustomUser; token: string }> {
    const result = await this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password: password || 'default-password' }),
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  async login(username: string, password: string): Promise<{ user: CustomUser; token: string }> {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  async getCurrentUser(): Promise<CustomUser> {
    return this.request('/users/me');
  }

  // Room Management
  async createRoom(name: string, isPublic: boolean = false): Promise<CustomRoom> {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, isPublic }),
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

  // Scene Management
  async saveScene(roomId: string, elements: readonly ExcalidrawElement[], appState: Partial<AppState>): Promise<void> {
    await this.request(`/rooms/${roomId}/scene`, {
      method: 'PUT',
      body: JSON.stringify({
        elements,
        appState,
        version: Date.now(),
      }),
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
    await this.request(`/rooms/${roomId}/files`, {
      method: 'POST',
      body: JSON.stringify({
        file_id: fileId,
        mime_type: fileData.mimeType,
        data: fileData.dataURL,
      }),
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

  // Token Management
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

// Utility functions
export const isLoggedIn = () => customAPI.isAuthenticated();

export const getCurrentUser = async (): Promise<CustomUser | null> => {
  if (!isLoggedIn()) {
    return null;
  }
  try {
    return await customAPI.getCurrentUser();
  } catch {
    return null;
  }
};

// Scene loading function (replaces the one from index.ts)
export const loadSceneFromRoom = async (roomId: string): Promise<ImportedDataState> => {
  try {
    const scene = await customAPI.loadScene(roomId);
    if (!scene) {
      return {
        elements: [],
        appState: {},
      };
    }

    const restored = restore(
      {
        elements: scene.elements,
        appState: scene.appState,
      },
      null,
      null,
      {
        repairBindings: true,
        refreshDimensions: false,
        deleteInvisibleElements: true,
      }
    );

    return {
      elements: restored.elements,
      appState: restored.appState,
      files: restored.files,
    };
  } catch (error) {
    console.error('Failed to load scene:', error);
    return {
      elements: [],
      appState: {},
    };
  }
};

// Scene saving function
export const saveSceneToRoom = async (
  roomId: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Save scene data
    await customAPI.saveScene(roomId, elements, appState);

    // Upload files if any
    for (const [fileId, fileData] of Object.entries(files)) {
      try {
        await customAPI.uploadFile(roomId, fileId, fileData);
      } catch (fileError) {
        console.warn(`Failed to upload file ${fileId}:`, fileError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save scene:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Auto-login for anonymous users
export const ensureAuthenticated = async (): Promise<boolean> => {
  if (isLoggedIn()) {
    return true;
  }

  try {
    // Generate anonymous username
    const anonymousUsername = `user_${Math.random().toString(36).substring(2, 8)}`;

    await customAPI.registerUser(anonymousUsername);
    return true;
  } catch (error) {
    console.error('Failed to create anonymous user:', error);
    return false;
  }
};