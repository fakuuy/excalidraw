import React from "react";
import { Card } from "@excalidraw/excalidraw/components/Card";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { useI18n } from "@excalidraw/excalidraw/i18n";

import type {
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import { customAPI } from "./api";

// FREE workspace export - no limits!
export const exportToCustomWorkspace = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  name: string,
) => {
  // Create a new room in our custom backend
  const room = await customAPI.createRoom(name, false);

  // Save the scene to our backend
  await customAPI.saveScene(room.id, {
    elements,
    app_state: appState,
    files,
    version: 1,
  });

  // Open the room in the same app (no external redirect needed)
  const roomUrl = `${window.location.origin}/#room=${room.id}`;

  // Copy link to clipboard and show success message
  await navigator.clipboard.writeText(roomUrl);

  alert(`¡Workspace creado exitosamente!\nEnlace copiado al portapapeles: ${roomUrl}`);

  return room;
};

export const CustomExportToWorkspace: React.FC<{
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}> = ({ elements, appState, files, name, onError, onSuccess }) => {
  const { t } = useI18n();

  return (
    <Card color="primary">
      <div className="Card-icon">
        <svg
          style={{ width: "2.8rem", height: "2.8rem" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
          <polyline points="9,9 9,15 15,15 15,9" />
          <line x1="12" y1="6" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="18" />
          <line x1="6" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="18" y2="12" />
        </svg>
      </div>
      <h2>Crear Workspace</h2>
      <div className="Card-details">
        Crea un workspace privado para colaborar en tiempo real.
        ¡Completamente GRATIS y sin límites!
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title="Crear Workspace Gratis"
        aria-label="Crear Workspace Gratis"
        showAriaLabel={true}
        onClick={async () => {
          try {
            if (!customAPI.isAuthenticated()) {
              onError(new Error("Debes iniciar sesión para crear un workspace"));
              return;
            }

            await exportToCustomWorkspace(elements, appState, files, name);
            onSuccess();
          } catch (error: any) {
            console.error(error);
            onError(new Error("Error al crear el workspace: " + error.message));
          }
        }}
      />
    </Card>
  );
};