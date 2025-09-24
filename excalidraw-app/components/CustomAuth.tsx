import React, { useState, useEffect } from "react";
import { loginIcon, usersIcon } from "@excalidraw/excalidraw/components/icons";
import { MainMenu } from "@excalidraw/excalidraw/index";
import { customAPI, getCurrentUser, ensureAuthenticated } from "../data/mongodb-backend";
import type { CustomUser } from "../data/mongodb-backend";

export const CustomAuthButton: React.FC = React.memo(() => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.log('User not authenticated');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthClick = async () => {
    if (user) {
      // User is logged in, maybe show profile or logout option
      return;
    }

    // Auto-register anonymous user
    try {
      setLoading(true);
      const success = await ensureAuthenticated();
      if (success) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainMenu.Item icon={loginIcon} onClick={() => {}}>
        Loading...
      </MainMenu.Item>
    );
  }

  return (
    <MainMenu.Item
      icon={user ? usersIcon : loginIcon}
      onClick={handleAuthClick}
      className={user ? "" : "highlighted"}
    >
      {user ? `Hello, ${user.displayName || user.username}` : "Get Started"}
    </MainMenu.Item>
  );
});

export const CustomRoomsButton: React.FC<{
  onCreateRoom: () => void;
}> = React.memo(({ onCreateRoom }) => {
  return (
    <MainMenu.Item
      onClick={onCreateRoom}
      className="highlighted"
    >
      Create Workspace
    </MainMenu.Item>
  );
});