# GitHub Secrets Configuration

Para que el deploy automático funcione, necesitas configurar estos **GitHub Secrets** en tu repositorio.

## 🔐 Cómo Configurar GitHub Secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret**
4. Agrega cada uno de estos secrets:

## 📋 GitHub Secrets Requeridos

### Existing Secrets (ya configurados)
- `SSH_PRIVATE_KEY` - Tu clave SSH privada para acceder al servidor
- `SSH_USER` - Usuario del servidor (ej: `ubuntu`, `root`)
- `SERVER_HOST` - IP o hostname de tu servidor

### New Secrets (nuevos para MongoDB)

#### Database Configuration
```
MONGO_ROOT_PASSWORD
Valor: tu-password-mongodb-super-seguro
Descripción: Password para el usuario root de MongoDB
```

#### Authentication
```
JWT_SECRET
Valor: ExCaLiDrAw-JWT-2024-ITICA-Super-Long-Secret-Key-With-Numbers-123456789
Descripción: Clave secreta para firmar tokens JWT (mínimo 50 caracteres, sin caracteres especiales problemáticos)
```

#### Optional (Redis)
```
REDIS_PASSWORD
Valor: tu-password-redis-seguro
Descripción: Password para Redis (opcional, para cache de sesiones)
```

## 🎯 Ejemplo de Valores

```bash
# STRONG passwords - cambia estos valores!
MONGO_ROOT_PASSWORD=ExCaLiDrAw2024MongoSecurePass987654321
JWT_SECRET=ExCaLiDrAw-JWT-Secret-Key-2024-ITICA-Super-Long-And-Secure-Without-Special-Chars
REDIS_PASSWORD=ReDiS-ExCaLiDrAw-2024-Cache-Pass123456789
```

## ⚠️ Caracteres Problemáticos

**EVITA estos caracteres en los secrets** (pueden causar errores de sintaxis):
- `$` `(` `)` `[` `]` `{` `}` `"` `'` `` ` `` `\` `|` `&` `;`

**USA solo estos caracteres seguros**:
- Letras: `A-Z a-z`
- Números: `0-9`
- Guiones: `-` `_`
- Puntos: `.`

## ⚠️ Importante

1. **Usa passwords fuertes** - mínimo 20 caracteres
2. **JWT_SECRET** debe ser muy largo y único
3. **Nunca commitees** estos valores al repositorio
4. **Cambia los passwords** en producción

## 🔒 Security Tips

- Usa generadores de passwords seguros
- JWT_SECRET debe ser diferente para cada entorno
- Considera rotar estos secrets cada 6-12 meses
- MongoDB password debe ser complejo (números, letras, símbolos)

## ✅ Verificación

Una vez configurados todos los secrets, el próximo push a `main` o `master` debería:

1. ✅ Deploy automático del backend (MongoDB + API)
2. ✅ Deploy automático del frontend (Excalidraw)
3. ✅ Configuración automática de la base de datos
4. ✅ Health checks de todos los servicios

## 📊 Monitoring

Después del deploy, verifica que todo funcione:

```bash
# Check backend API
curl https://api.itica.lat/health

# Check frontend
curl https://excalidraw.faku.pro/health

# Check MongoDB (desde el servidor)
docker exec excalidraw-mongodb mongosh --eval "db.stats()"
```

## 🆘 Troubleshooting

Si el deploy falla:

1. **Revisa GitHub Actions logs** para ver el error específico
2. **Verifica todos los secrets** están configurados correctamente
3. **Conecta por SSH** al servidor para ver logs de containers:
   ```bash
   docker-compose -f docker-compose.backend.yml logs
   ```

## 🔄 Manual Override

Si necesitas correr el deploy manualmente:

```bash
# En tu servidor
cd /home/usuario/excalidraw-hosted
git pull origin main
docker-compose -f docker-compose.backend.yml up -d --build
```