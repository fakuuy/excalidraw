// Configuration to remove Excalidraw+ features and make everything FREE

// Override environment variables to disable plus features
export const customEnvConfig = {
  // Disable Excalidraw+ app integration
  VITE_APP_PLUS_APP: undefined,
  VITE_APP_PLUS_LP: undefined,

  // Set custom API URL
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "https://api.itica.lat",

  // Disable Firebase (we use custom backend)
  VITE_APP_FIREBASE_CONFIG: undefined,

  // Enable all features for free
  VITE_APP_ENABLE_COLLABORATION: "true",
  VITE_APP_ENABLE_WORKSPACES: "true",
  VITE_APP_ENABLE_AI: "false", // Set to true if you want AI features

  // Custom branding
  VITE_APP_NAME: "Excalidraw - ITICA",
  VITE_APP_DOMAIN: "excalidraw.faku.pro",
};

// Feature flags - everything enabled and FREE!
export const featureFlags = {
  // Collaboration features
  enableRealTimeCollaboration: true,
  enableRoomCreation: true,
  enableRoomSharing: true,
  enableMultipleRooms: true,  // Unlimited rooms!

  // Export features
  enableCloudExport: true,
  enableImageExport: true,
  enablePDFExport: true,
  enableSVGExport: true,

  // Advanced features (normally Plus only)
  enableLiveCollaboration: true,
  enablePersistentStorage: true,
  enableFileUploads: true,
  enableHistoryVersions: true,

  // AI features (optional)
  enableAIFeatures: false,

  // Limits (set to high numbers for "unlimited")
  maxRoomsPerUser: 999,
  maxFilesPerRoom: 1000,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxRoomParticipants: 100,

  // UI features
  showPlusReferences: false,  // Hide all Plus branding
  showUpgradePrompts: false,  // No upgrade prompts
  showLimitWarnings: false,   // No limit warnings
};

// Custom text/translations to remove Plus references
export const customTexts = {
  "exportDialog.excalidrawplus_description": "Guarda tu dibujo en un workspace colaborativo gratuito.",
  "exportDialog.excalidrawplus_button": "Crear Workspace Gratis",
  "roomDialog.desc_intro": "Invita a otros a colaborar en tiempo real:",
  "roomDialog.desc_privacy": "No te preocupes, tus sesiones están encriptadas de extremo a extremo.",
  "welcome.collaboration.dialog_title": "¡Colaboración Gratuita!",
  "welcome.collaboration.dialog_text": "Crea workspaces ilimitados y colabora en tiempo real. Todo completamente gratis.",
};

// Apply custom configuration
export const applyCustomConfig = () => {
  // Override environment variables
  Object.entries(customEnvConfig).forEach(([key, value]) => {
    if (value !== undefined) {
      process.env[key] = value;
    }
  });

  // Add custom CSS to hide Plus elements
  const style = document.createElement('style');
  style.textContent = `
    /* Hide Excalidraw+ elements */
    [data-testid="plus-link"],
    [data-testid="excalidraw-plus"],
    .ExcalidrawPlus,
    .plus-link,
    .upgrade-prompt {
      display: none !important;
    }

    /* Custom branding */
    .ExcalidrawLogo::after {
      content: " - ITICA";
      font-size: 0.8em;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);

  console.log('✅ Custom configuration applied - All features enabled for FREE!');
};

// Function to check if a feature should be enabled
export const isFeatureEnabled = (feature: keyof typeof featureFlags): boolean => {
  return featureFlags[feature] as boolean;
};

// Function to get feature limits
export const getFeatureLimit = (feature: keyof typeof featureFlags): number => {
  return featureFlags[feature] as number;
};