# 🚀 Guía de Despliegue - Hotel Paraíso Backend

## Variables de Entorno de Vercel

### Backend (hotel-paraiso-backend.vercel.app)

```bash
# En Vercel Dashboard > Settings > Environment Variables
DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@localhost:5433/postgres
NEXTAUTH_SECRET=production-secret-super-seguro-aqui
NEXTAUTH_URL=https://hotel-paraiso-backend.vercel.app
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
GOOGLE_OAUTH_CLIENT_ID=1028827880010-bsjn74gnr76kh0utiom3ci7gvtud05le.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=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
GOOGLE_OAUTH_REDIRECT_URI=https://hotel-paraiso-frontend.vercel.app/api/auth/callback/google
GOOGLE_ACCESS_TOKEN=tu-google-access-token
GOOGLE_REFRESH_TOKEN=tu-google-refresh-token
```

### Frontend (hotel-paraiso-frontend.vercel.app)

```bash
# En Vercel Dashboard > Settings > Environment Variables
NEXTAUTH_URL=https://hotel-paraiso-frontend.vercel.app
NEXTAUTH_SECRET=production-secret-super-seguro-aqui
NEXTAUTH_BACKEND_URL=https://hotel-paraiso-backend.vercel.app
NEXT_PUBLIC_API_URL=https://hotel-paraiso-backend.vercel.app
```

## 📋 Pasos de Despliegue

### 1. Preparar Base de Datos
- ✅ Tu base de datos ya está en fly.io
- ✅ Actualizar DATABASE_URL con la URL de producción

### 2. Desplegar Backend
```bash
cd Backendparaiso/hotel-paraiso-backend
vercel --prod
```

### 3. Desplegar Frontend
```bash
cd frontendparaiso
vercel --prod
```

### 4. Configurar Dominios (Opcional)
- Backend: `api.hotelparaisoverde.com`
- Frontend: `hotelparaisoverde.com`

## ⚠️ Consideraciones Importantes

1. **CORS**: Configurado para permitir el frontend en producción
2. **NextAuth**: URLs actualizadas para producción
3. **Google Drive**: Credenciales configuradas como secrets
4. **Base de Datos**: Usar la instancia de fly.io
5. **Middleware**: Actualizado para manejar múltiples orígenes

## 🔐 Seguridad

- Cambiar NEXTAUTH_SECRET en producción
- Verificar que las credenciales de Google Drive estén seguras
- Confirmar que la base de datos tenga restricciones de IP apropiadas 