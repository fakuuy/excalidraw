// Main integration file to replace Firebase with custom backend
export { customAPI } from "./api";
export {
  saveToCustomBackend as saveToFirebase,
  loadFromCustomBackend as loadFromFirebase,
  saveFilesToCustomBackend as saveFilesToFirebase,
  loadFilesFromCustomBackend as loadFilesFromFirebase,
  isSavedToCustomBackend as isSavedToFirebase,
  createRoom,
  getUserRooms,
  deleteRoom,
  getCurrentUser,
  updateUserProfile,
  loginRequired,
} from "./custom-data";

export { CustomExportToWorkspace as ExportToExcalidrawPlus } from "./CustomExportDialog";
export { CustomAuth, useCustomAuth } from "./CustomAuth";
export {
  applyCustomConfig,
  featureFlags,
  isFeatureEnabled,
  getFeatureLimit,
  customTexts
} from "./no-plus-config";

// Initialize custom configuration when imported
import { applyCustomConfig } from "./no-plus-config";
applyCustomConfig();