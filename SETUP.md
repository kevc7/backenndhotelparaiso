# 🚀 Guía de Configuración - Hotel Paraíso Backend

Esta guía te ayudará a configurar el proyecto desde cero en tu máquina local.

## ✅ Checklist de Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- [ ] **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- [ ] **Git** - [Descargar aquí](https://git-scm.com/)
- [ ] **Fly CLI** - [Instalar aquí](https://fly.io/docs/flyctl/install/)
- [ ] **Editor de código** (VS Code recomendado)

## 🔧 Configuración Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd hotel-paraiso-backend
```

### 2. Instalar Dependencias

```bash
npm install
```

**Dependencias principales instaladas:**
- `next` - Framework React
- `pg` - Cliente PostgreSQL
- `@types/pg` - Tipos TypeScript para pg

### 3. Configurar Variables de Entorno

Crear archivo `.env.local` en la raíz del proyecto:

```bash
# .env.local
DATABASE_URL="postgres://postgres:ehsWijNq5CGG9lv@localhost:5433"
NEXTAUTH_SECRET="tu-secret-key-aqui"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Configurar Acceso a Base de Datos

#### Opción A: Usando Fly Proxy (Recomendado)

1. **Autenticar con Fly.io:**
```bash
fly auth login
```

2. **Iniciar proxy (mantener corriendo):**
```bash
fly proxy 5433:5432 -a paraisobd-db
```

3. **Dejar corriendo en terminal separado**

#### Opción B: Base de Datos Local (Alternativa)

Si prefieres usar PostgreSQL local:

1. **Instalar PostgreSQL localmente**
2. **Crear base de datos:**
```sql
CREATE DATABASE hotel_paraiso;
```

3. **Ejecutar script de esquema** (contactar administrador para obtenerlo)

4. **Actualizar DATABASE_URL:**
```bash
DATABASE_URL="postgres://usuario:password@localhost:5432/hotel_paraiso"
```

### 5. Verificar Configuración

1. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

2. **Verificar health check:**
```
Abrir: http://localhost:3000/api/health
```

3. **Respuesta esperada:**
```json
{
  "status": "ok",
  "message": "Hotel Paraíso ERP Backend funcionando correctamente",
  "database": {
    "connected": true
  }
}
```

### 6. Probar APIs

Ejecutar script de pruebas (Windows PowerShell):
```bash
./test-apis.ps1
```

O probar manualmente:
```bash
# Listar tipos de habitación
curl http://localhost:3000/api/tipos-habitacion

# Listar habitaciones
curl http://localhost:3000/api/habitaciones
```

## 🛠️ Configuración del Editor

### VS Code (Recomendado)

Instalar extensiones recomendadas:
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Prettier - Code formatter**
- **ESLint**
- **Thunder Client** (para probar APIs)

### Configuración de Prettier

Crear `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 🔍 Solución de Problemas Comunes

### Error: "Cannot connect to database"

**Posibles causas:**
1. Fly proxy no está corriendo
2. Credenciales incorrectas
3. Firewall bloqueando conexión

**Soluciones:**
1. Verificar que `fly proxy 5433:5432 -a paraisobd-db` esté corriendo
2. Verificar variables de entorno
3. Probar conexión: `fly ssh console -a paraisobd-db`

### Error: "Port 5433 already in use"

**Solución:**
```bash
# Encontrar proceso usando el puerto
netstat -ano | findstr :5433

# Terminar proceso (reemplazar PID)
taskkill /PID <numero-pid> /F

# O usar puerto diferente
fly proxy 5434:5432 -a paraisobd-db
```

### Error: "Module not found"

**Solución:**
```bash
# Limpiar node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### Error: "TypeScript compilation errors"

**Solución:**
```bash
# Verificar tipos
npm run type-check

# Regenerar tipos si es necesario
npm run build
```

## 📊 Verificación de Estado

### Comandos Útiles

```bash
# Ver estado del servidor
npm run dev

# Verificar conexión a BD
curl http://localhost:3000/api/health

# Ver logs de Fly.io
fly logs -a paraisobd-db

# Ver estado de la app en Fly.io
fly status -a paraisobd-db
```

### Indicadores de Éxito

✅ **Servidor corriendo:** `http://localhost:3000` responde
✅ **Base de datos conectada:** Health check retorna `connected: true`
✅ **APIs funcionando:** Endpoints retornan datos válidos
✅ **Sin errores TypeScript:** Build completa exitosamente

## 🚀 Siguientes Pasos

Una vez configurado exitosamente:

1. **Revisar documentación** en `README.md`
2. **Explorar estructura** del proyecto
3. **Probar APIs existentes** con herramientas como Postman
4. **Revisar código fuente** para entender arquitectura
5. **Comenzar desarrollo** de nuevas funcionalidades

## 📞 Ayuda Adicional

Si encuentras problemas:

1. **Revisar logs** en consola del servidor
2. **Verificar variables de entorno**
3. **Probar conexión a BD** independientemente
4. **Consultar documentación** de dependencias
5. **Contactar al equipo** si persisten problemas

---

**¡Configuración completada! 🎉**

*Ahora estás listo para desarrollar en el Hotel Paraíso Backend.* 