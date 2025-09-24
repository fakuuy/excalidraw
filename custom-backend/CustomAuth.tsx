import React, { useState, useEffect } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { TextField } from "@excalidraw/excalidraw/components/TextField";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { useI18n } from "@excalidraw/excalidraw/i18n";

import { customAPI, type CustomUser } from "./api";

interface CustomAuthProps {
  onClose: () => void;
  onSuccess: (user: CustomUser) => void;
}

export const CustomAuth: React.FC<CustomAuthProps> = ({ onClose, onSuccess }) => {
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // For login, we'll assume your API handles authentication
        // and returns a token. Adjust based on your actual API
        const response = await fetch(`${process.env.VITE_API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email }),
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const { token, user } = await response.json();
        customAPI.setToken(token);
        onSuccess(user);
      } else {
        // Register new user
        const user = await customAPI.registerUser(username, email);
        // Assuming registration also returns a token or auto-logs in
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onCloseRequest={onClose} title={isLogin ? "Iniciar Sesión" : "Registro"} size="small">
      <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
        <div style={{ marginBottom: "16px" }}>
          <TextField
            label="Nombre de usuario"
            value={username}
            onChange={(value) => setUsername(value)}
            required
            placeholder="Tu nombre de usuario"
          />
        </div>

        {!isLogin && (
          <div style={{ marginBottom: "16px" }}>
            <TextField
              label="Email (opcional)"
              value={email}
              onChange={(value) => setEmail(value)}
              type="email"
              placeholder="tu@email.com"
            />
          </div>
        )}

        {error && (
          <div style={{
            color: "#e74c3c",
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#fdf2f2",
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: "none",
              border: "none",
              color: "#6c7b7f",
              fontSize: "14px",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            {isLogin ? "¿Necesitas una cuenta? Registrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>

          <ToolButton
            type="submit"
            title={isLogin ? "Iniciar Sesión" : "Registrarse"}
            aria-label={isLogin ? "Iniciar Sesión" : "Registrarse"}
            disabled={loading || !username.trim()}
          >
            {loading ? "..." : (isLogin ? "Entrar" : "Registrar")}
          </ToolButton>
        </div>
      </form>
    </Dialog>
  );
};

// Hook to manage authentication state
export const useCustomAuth = () => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (customAPI.isAuthenticated()) {
          const currentUser = await customAPI.getUserProfile();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        customAPI.clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData: CustomUser) => {
    setUser(userData);
  };

  const logout = () => {
    customAPI.clearToken();
    setUser(null);
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};