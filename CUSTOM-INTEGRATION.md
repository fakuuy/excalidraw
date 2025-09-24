# Excalidraw Custom Integration Guide

Esta guía explica cómo integrar Excalidraw con tu infraestructura propia, eliminando Firebase y habilitando todas las funciones de manera gratuita.

## 🎯 Objetivos

- ✅ Mantener el mismo sistema de login pero registrar en tu DB
- ✅ Eliminar planes de pago (todo gratis)
- ✅ Habilitar workspaces ilimitados para todos
- ✅ Integración completa con tu backend

## 📁 Archivos Creados

```
custom-backend/
├── api.ts                  # API client para tu backend
├── custom-data.ts          # Reemplazo de firebase.ts
├── CustomAuth.tsx          # Componente de login personalizado
├── CustomExportDialog.tsx  # Diálogo de export sin Plus
├── no-plus-config.ts       # Configuración sin funciones de pago
└── index.ts               # Punto de entrada principal

database/
└── schema.sql             # Schema de base de datos

CUSTOM-INTEGRATION.md      # Esta guía
```

## 🗄️ Configuración de Base de Datos (MongoDB)

### 1. Configurar MongoDB

```bash
# Instalar MongoDB
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS
brew install mongodb/brew/mongodb-community

# Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Ejecutar Setup de Schema

```bash
# Ejecutar el script de configuración
node database/mongodb-schema.js
```

### 3. Colecciones Principales

- **`users`**: Usuarios registrados
- **`rooms`**: Workspaces (ilimitados y gratis)
- **`scenes`**: Datos de dibujos (JSON nativo)
- **`files`**: Archivos e imágenes (GridFS para archivos grandes)
- **`sessions`**: Sesiones WebSocket activas
- **`roomParticipants`**: Colaboradores en tiempo real

### 4. Ventajas de MongoDB para Excalidraw

- ✅ **JSON nativo**: Los elementos de Excalidraw se almacenan directamente
- ✅ **Escalabilidad**: Maneja grandes cantidades de datos de dibujo
- ✅ **Flexibilidad**: Schema dinámico para futuras funciones
- ✅ **GridFS**: Para archivos grandes automáticamente
- ✅ **Indexación**: Búsquedas rápidas por usuario/room/fecha

## 🔧 Configuración del Backend

### 1. Variables de Entorno

Agregar a tu `.env`:

```env
# Frontend Configuration
VITE_API_BASE_URL=https://api.itica.lat
VITE_APP_FIREBASE_CONFIG=
VITE_APP_PLUS_APP=
VITE_APP_PLUS_LP=
VITE_APP_ENABLE_COLLABORATION=true
VITE_APP_ENABLE_WORKSPACES=true
VITE_APP_NAME="Excalidraw - ITICA"
VITE_APP_DOMAIN="excalidraw.faku.pro"

# Backend Configuration
MONGODB_URI=mongodb://localhost:27017/excalidraw
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://excalidraw.faku.pro
PORT=3001

# Production MongoDB (Atlas)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/excalidraw?retryWrites=true&w=majority
```

### 2. Endpoints de API Requeridos

Tu backend debe implementar estos endpoints:

```typescript
// Autenticación
POST /auth/login              # Login de usuario
POST /auth/logout             # Logout
GET  /users/me                # Perfil del usuario actual
POST /users/register          # Registro de nuevos usuarios
PATCH /users/me               # Actualizar perfil

// Gestión de Rooms
GET    /rooms/my-rooms        # Rooms del usuario
POST   /rooms                 # Crear nuevo room
GET    /rooms/:id             # Obtener room específico
DELETE /rooms/:id             # Eliminar room

// Datos de Escenas
GET /rooms/:id/scene          # Cargar escena
PUT /rooms/:id/scene          # Guardar escena

// Archivos
POST /rooms/:id/files         # Subir archivo
GET  /rooms/:id/files/:fileId # Obtener archivo
```

## 🔄 Integración con Excalidraw

### 1. Reemplazar Imports de Firebase

En los archivos de Excalidraw, reemplaza:

```typescript
// ANTES
import {
  saveToFirebase,
  loadFromFirebase,
  // ... otros imports de firebase
} from "./data/firebase";

// DESPUÉS
import {
  saveToFirebase,
  loadFromFirebase,
  // ... otros imports
} from "./custom-backend";
```

### 2. Actualizar Componentes

Reemplaza componentes que referencien Excalidraw+:

```typescript
// ANTES
import { ExportToExcalidrawPlus } from "./components/ExportToExcalidrawPlus";

// DESPUÉS
import { CustomExportToWorkspace as ExportToExcalidrawPlus } from "./custom-backend";
```

### 3. Integrar Autenticación

En tu componente principal:

```typescript
import React from "react";
import { useCustomAuth, CustomAuth } from "./custom-backend";

export const App = () => {
  const { user, isAuthenticated, login, logout } = useCustomAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (!isAuthenticated) {
    return (
      <CustomAuth
        onClose={() => setShowAuth(false)}
        onSuccess={login}
      />
    );
  }

  return (
    <div>
      {/* Tu UI de Excalidraw aquí */}
      <button onClick={logout}>Cerrar Sesión</button>
    </div>
  );
};
```

## 🎨 Funciones Habilitadas GRATIS

### ✅ Características Desbloqueadas

- 🏠 **Workspaces ilimitados** por usuario
- 👥 **Colaboración en tiempo real** sin límites
- 📁 **100MB** de archivos por room
- 🔄 **100 participantes** por room
- 💾 **Almacenamiento persistente**
- 📤 **Export a todos los formatos**
- 🎨 **Todas las herramientas de dibujo**

### 🚫 Funciones Eliminadas

- ❌ Referencias a Excalidraw+
- ❌ Prompts de actualización
- ❌ Limitaciones de plan
- ❌ Integraciones de pago

## 🔒 Autenticación y Autorización

### 1. Sistema de Tokens JWT

```typescript
// Ejemplo de middleware de autenticación
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 2. Permisos de Room

```typescript
// Verificar acceso a room
export const checkRoomAccess = async (userId, roomId) => {
  const room = await Room.findById(roomId);
  const participant = await RoomParticipant.findOne({
    room_id: roomId,
    user_id: userId
  });

  return room.is_public || room.owner_id === userId || participant;
};
```

## 🚀 Despliegue

### 1. Construir con Configuración Personalizada

```bash
# Construir con backend personalizado
npm run build

# Variables de entorno en producción
export VITE_API_BASE_URL="https://api.itica.lat"
export VITE_APP_FIREBASE_CONFIG=""
```

### 2. Actualizar docker-compose

```yaml
# Agregar variables de entorno al contenedor
environment:
  - VITE_API_BASE_URL=https://api.itica.lat
  - VITE_APP_FIREBASE_CONFIG=
  - VITE_APP_PLUS_APP=
```

## 🧪 Testing

### 1. Probar Funcionalidades

```bash
# Verificar que todas las funciones estén habilitadas
curl https://excalidraw.faku.pro/api/features

# Probar creación de room
curl -X POST https://api.itica.lat/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Test Room", "is_public": false}'
```

### 2. Validar UI

- ✅ No hay referencias a "Plus" o "Upgrade"
- ✅ Todas las opciones de export están disponibles
- ✅ Colaboración funciona sin límites
- ✅ Login/registro con tu sistema

## 📊 Monitoring

### 1. Métricas Importantes

- Usuarios activos por día
- Rooms creados por día
- Datos almacenados por room
- Sesiones de colaboración concurrentes

### 2. Logs Recomendados

```typescript
// Logging de actividad
console.log('Room created:', {
  roomId: room.id,
  userId: user.id,
  timestamp: new Date(),
  isPublic: room.is_public
});

console.log('Scene saved:', {
  roomId,
  elementsCount: elements.length,
  fileCount: Object.keys(files).length,
  version: scene.version
});
```

## 🆘 Troubleshooting

### Problemas Comunes

1. **"Firebase not configured"**
   - Verificar que `VITE_APP_FIREBASE_CONFIG` esté vacío
   - Confirmar que imports usen custom-backend

2. **"Authentication failed"**
   - Verificar token JWT válido
   - Confirmar endpoints de API funcionando

3. **"Room creation failed"**
   - Verificar permisos de usuario
   - Confirmar base de datos configurada

4. **"Files not loading"**
   - Verificar límites de tamaño de archivo
   - Confirmar encoding de data URLs

## ✅ Checklist de Implementación

- [ ] Base de datos configurada con schema.sql
- [ ] Backend API implementado con todos los endpoints
- [ ] Variables de entorno configuradas
- [ ] Imports de Firebase reemplazados
- [ ] Componentes Plus removidos
- [ ] Autenticación integrada con tu sistema
- [ ] Features flags habilitados
- [ ] Tests de funcionalidad pasando
- [ ] Deploy en producción funcionando

## 🎉 Resultado Final

Tu instancia de Excalidraw tendrá:

- 🔐 **Login integrado** con tu base de usuarios
- 🏠 **Workspaces ilimitados** para todos
- 👥 **Colaboración gratuita** sin restricciones
- 🎨 **Todas las funciones** desbloqueadas
- 🔒 **Datos en tu infraestructura**
- 🎯 **Sin dependencias externas** (Firebase, etc.)

¡Tu Excalidraw personalizado está listo para usar!