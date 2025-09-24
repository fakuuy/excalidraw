// Custom data layer to replace Firebase functionality
import { reconcileElements } from "@excalidraw/excalidraw";
import { MIME_TYPES } from "@excalidraw/common";
import { getSceneVersion } from "@excalidraw/element";
import { restoreElements } from "@excalidraw/excalidraw/data/restore";

import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type {
  ExcalidrawElement,
  FileId,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFileMetadata,
} from "@excalidraw/excalidraw/types";

import { getSyncableElements } from "../data";
import type { SyncableExcalidrawElement } from "../data";
import type Portal from "../collab/Portal";
import type { Socket } from "socket.io-client";

import { customAPI, CustomScene } from "./api";

// Scene version cache for optimization
class CustomSceneVersionCache {
  private static cache = new WeakMap<Socket, number>();

  static get = (socket: Socket) => {
    return CustomSceneVersionCache.cache.get(socket);
  };

  static set = (
    socket: Socket,
    elements: readonly SyncableExcalidrawElement[],
  ) => {
    CustomSceneVersionCache.cache.set(socket, getSceneVersion(elements));
  };
}

export const isSavedToCustomBackend = (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
): boolean => {
  if (portal.socket && portal.roomId) {
    const sceneVersion = getSceneVersion(elements);
    return CustomSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  return true;
};

export const saveToCustomBackend = async (
  portal: Portal,
  elements: readonly SyncableExcalidrawElement[],
  appState: AppState,
): Promise<readonly SyncableExcalidrawElement[] | null> => {
  const { roomId, socket } = portal;

  if (
    !roomId ||
    !socket ||
    isSavedToCustomBackend(portal, elements)
  ) {
    return null;
  }

  try {
    // Load existing scene to reconcile
    const existingScene = await customAPI.loadScene(roomId);

    let reconciledElements: readonly SyncableExcalidrawElement[];

    if (existingScene) {
      // Reconcile with existing elements
      const prevElements = getSyncableElements(
        restoreElements(existingScene.elements, null)
      );

      reconciledElements = getSyncableElements(
        reconcileElements(
          elements,
          prevElements as OrderedExcalidrawElement[] as RemoteExcalidrawElement[],
          appState,
        ),
      );
    } else {
      reconciledElements = elements;
    }

    // Extract files from elements
    const files: Record<string, BinaryFileData> = {};
    // Note: Files would need to be passed or extracted from current state

    // Save scene to custom backend
    const sceneData: Omit<CustomScene, 'room_id' | 'updated_at'> = {
      elements: reconciledElements,
      app_state: appState,
      files,
      version: getSceneVersion(reconciledElements),
    };

    await customAPI.saveScene(roomId, sceneData);

    // Update cache
    CustomSceneVersionCache.set(socket, reconciledElements);

    return reconciledElements;
  } catch (error) {
    console.error('Failed to save to custom backend:', error);
    throw error;
  }
};

export const loadFromCustomBackend = async (
  roomId: string,
  socket: Socket | null,
): Promise<readonly SyncableExcalidrawElement[] | null> => {
  try {
    const scene = await customAPI.loadScene(roomId);

    if (!scene) {
      return null;
    }

    const elements = getSyncableElements(
      restoreElements(scene.elements, null, {
        deleteInvisibleElements: true,
      }),
    );

    if (socket) {
      CustomSceneVersionCache.set(socket, elements);
    }

    return elements;
  } catch (error) {
    console.error('Failed to load from custom backend:', error);
    return null;
  }
};

export const saveFilesToCustomBackend = async ({
  roomId,
  files,
}: {
  roomId: string;
  files: { id: FileId; buffer: Uint8Array; mimeType?: string }[];
}) => {
  const erroredFiles: FileId[] = [];
  const savedFiles: FileId[] = [];

  await Promise.all(
    files.map(async ({ id, buffer, mimeType = MIME_TYPES.binary }) => {
      try {
        // Convert buffer to data URL
        const blob = new Blob([buffer], { type: mimeType });
        const dataURL = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const fileData: BinaryFileData = {
          mimeType,
          id,
          dataURL: dataURL as any,
          created: Date.now(),
          lastRetrieved: Date.now(),
        };

        await customAPI.uploadFile(roomId, id, fileData);
        savedFiles.push(id);
      } catch (error: any) {
        console.error(`Failed to upload file ${id}:`, error);
        erroredFiles.push(id);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadFilesFromCustomBackend = async (
  roomId: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const fileData = await customAPI.getFile(roomId, id);

        if (fileData) {
          loadedFiles.push(fileData);
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        console.error(`Failed to load file ${id}:`, error);
        erroredFiles.set(id, true);
      }
    }),
  );

  return { loadedFiles, erroredFiles };
};

// Room management functions (FREE for everyone!)
export const createRoom = async (name: string, isPublic: boolean = false) => {
  if (!customAPI.isAuthenticated()) {
    throw new Error('User must be logged in to create rooms');
  }

  return await customAPI.createRoom(name, isPublic);
};

export const getUserRooms = async () => {
  if (!customAPI.isAuthenticated()) {
    return [];
  }

  return await customAPI.getUserRooms();
};

export const deleteRoom = async (roomId: string) => {
  return await customAPI.deleteRoom(roomId);
};

// User management
export const getCurrentUser = async () => {
  return await customAPI.getUserProfile();
};

export const updateUserProfile = async (username: string) => {
  return await customAPI.updateUsername(username);
};

// Authentication helpers
export const loginRequired = () => {
  if (!customAPI.isAuthenticated()) {
    // Redirect to login or show login modal
    window.location.href = '/login';
    return false;
  }
  return true;
};