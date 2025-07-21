# 🏨 Hotel Paraíso - ERP Backend

Sistema de gestión hotelera completo desarrollado con Next.js, PostgreSQL y desplegado en Fly.io.

## 📋 Tabla de Contenidos

- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Base de Datos](#-base-de-datos)
- [APIs Documentadas](#-apis-documentadas)
- [Flujo de Negocio](#-flujo-de-negocio)
- [Desarrollo](#-desarrollo)
- [Despliegue](#-despliegue)
- [Próximos Pasos](#-próximos-pasos)

## 🎯 Descripción del Proyecto

**Hotel Paraíso ERP** es un sistema completo de gestión hotelera que permite:

- 🏨 **Gestión de habitaciones** con estados dinámicos
- 📋 **Sistema de reservas** con validaciones automáticas
- 👥 **Gestión de clientes** y usuarios del sistema
- 💰 **Procesamiento de pagos** con comprobantes fotográficos
- 📄 **Generación automática de facturas** en PDF
- ☁️ **Almacenamiento en la nube** con Google Drive
- 🔐 **Sistema de autenticación** con roles diferenciados

### Flujo Principal del Negocio

1. **Cliente** completa formulario web con foto del comprobante de pago
2. **Staff** revisa y aprueba/rechaza la reserva
3. **Sistema** actualiza automáticamente estados de habitaciones
4. **Sistema** genera facturas y almacena documentos

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend Web  │    │  Next.js API    │    │  PostgreSQL DB  │
│   (Formularios) │◄──►│   (Backend)     │◄──►│    (Fly.io)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Servicios Ext.  │
                    │ • Google Drive  │
                    │ • PDFkit        │
                    │ • NextAuth.js   │
                    └─────────────────┘
```

### Stack Tecnológico

- **Backend:** Next.js 14+ con App Router
- **Base de Datos:** PostgreSQL 17.2 en Fly.io
- **ORM:** Conexión directa con `pg` (sin Prisma por problemas de compatibilidad)
- **Autenticación:** NextAuth.js (pendiente implementación)
- **Documentos:** PDFkit para generación de facturas
- **Almacenamiento:** Google Drive API para comprobantes
- **Despliegue:** Fly.io / Vercel

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- PostgreSQL (local o remoto)
- Fly CLI (para acceso a base de datos)
- Git

### Configuración Local

1. **Clonar el repositorio:**
```bash
git clone <repository-url>
cd hotel-paraiso-backend
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Crear archivo .env.local
DATABASE_URL="postgres://postgres:ehsWijNq5CGG9lv@localhost:5433"
NEXTAUTH_SECRET="tu-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Iniciar proxy de base de datos:**
```bash
# En terminal separado (mantener corriendo)
fly proxy 5433:5432 -a paraisobd-db
```

5. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

6. **Verificar instalación:**
```
Abrir: http://localhost:3000/api/health
```

## 🗄️ Base de Datos

### Información de Conexión

- **Host:** paraisobd-db.flycast (interno Fly.io)
- **Puerto:** 5432
- **Base de datos:** postgres
- **Usuario:** postgres
- **Contraseña:** ehsWijNq5CGG9lv
- **Proxy local:** localhost:5433

### Esquema de Base de Datos

El sistema cuenta con **9 tablas principales**:

#### 1. `tipos_habitacion`
```sql
- id (SERIAL PRIMARY KEY)
- nombre (VARCHAR UNIQUE)
- descripcion (TEXT)
- capacidad_maxima (INTEGER)
- precio_base (DECIMAL)
- servicios (TEXT)
- fecha_creacion (TIMESTAMP)
- fecha_actualizacion (TIMESTAMP)
```

#### 2. `habitaciones`
```sql
- id (SERIAL PRIMARY KEY)
- numero (VARCHAR UNIQUE)
- piso (INTEGER)
- tipo_habitacion_id (FOREIGN KEY)
- estado (ENUM: 'libre', 'ocupada', 'reservada', 'mantenimiento')
- precio_noche (DECIMAL)
- descripcion (TEXT)
- fecha_creacion (TIMESTAMP)
- fecha_actualizacion (TIMESTAMP)
```

#### 3. `usuarios`
```sql
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- nombre (VARCHAR)
- apellido (VARCHAR)
- rol (ENUM: 'admin', 'staff')
- activo (BOOLEAN)
- fecha_creacion (TIMESTAMP)
```

#### 4. `clientes`
```sql
- id (SERIAL PRIMARY KEY)
- nombre (VARCHAR)
- apellido (VARCHAR)
- email (VARCHAR)
- telefono (VARCHAR)
- documento_identidad (VARCHAR)
- fecha_creacion (TIMESTAMP)
```

#### 5. `reservas`
```sql
- id (SERIAL PRIMARY KEY)
- codigo_reserva (VARCHAR UNIQUE)
- cliente_id (FOREIGN KEY)
- fecha_checkin (DATE)
- fecha_checkout (DATE)
- estado (ENUM: 'pendiente', 'confirmada', 'cancelada')
- total_estimado (DECIMAL)
- observaciones (TEXT)
- fecha_creacion (TIMESTAMP)
```

#### 6. `reserva_habitaciones`
```sql
- id (SERIAL PRIMARY KEY)
- reserva_id (FOREIGN KEY)
- habitacion_id (FOREIGN KEY)
- precio_noche (DECIMAL)
- fecha_asignacion (TIMESTAMP)
```

#### 7. `comprobantes_pago`
```sql
- id (SERIAL PRIMARY KEY)
- reserva_id (FOREIGN KEY)
- tipo_comprobante (VARCHAR)
- monto (DECIMAL)
- fecha_pago (DATE)
- url_imagen (VARCHAR)
- estado_revision (ENUM: 'pendiente', 'aprobado', 'rechazado')
- observaciones_staff (TEXT)
- fecha_subida (TIMESTAMP)
```

#### 8. `facturas_cabecera`
```sql
- id (SERIAL PRIMARY KEY)
- numero_factura (VARCHAR UNIQUE)
- reserva_id (FOREIGN KEY)
- fecha_emision (DATE)
- subtotal (DECIMAL)
- impuestos (DECIMAL)
- total (DECIMAL)
- estado (ENUM: 'borrador', 'emitida', 'pagada', 'anulada')
- url_pdf (VARCHAR)
```

#### 9. `facturas_lineas`
```sql
- id (SERIAL PRIMARY KEY)
- factura_id (FOREIGN KEY)
- descripcion (VARCHAR)
- cantidad (INTEGER)
- precio_unitario (DECIMAL)
- subtotal (DECIMAL)
```

### Triggers y Funciones Automáticas

El sistema incluye triggers para:
- **Actualización automática** de timestamps
- **Generación de códigos** de reserva únicos
- **Cálculo automático** de totales en facturas
- **Validación de disponibilidad** de habitaciones
- **Limpieza automática** de reservas expiradas

## 🔌 APIs Documentadas

### Health Check

**GET** `/api/health`

Verifica el estado del sistema y conexión a base de datos.

**Respuesta:**
```json
{
  "status": "ok",
  "message": "Hotel Paraíso ERP Backend funcionando correctamente",
  "timestamp": "2025-06-30T03:00:00.000Z",
  "database": {
    "connected": true,
    "server_time": "2025-06-30T03:00:00.000Z",
    "version": "PostgreSQL 17.2..."
  },
  "hotel_stats": {
    "tablas_existentes": ["usuarios", "habitaciones", ...],
    "usuarios": "0",
    "habitaciones": [{"total": "0"}],
    "reservas": [{"total": "0"}]
  }
}
```

### Tipos de Habitación

#### Listar Tipos
**GET** `/api/tipos-habitacion`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Habitación Simple",
      "descripcion": "Habitación individual",
      "capacidad_maxima": 1,
      "precio_base": "80.00",
      "servicios": "WiFi, TV, Baño privado",
      "fecha_creacion": "2025-06-30T08:00:00.000Z",
      "fecha_actualizacion": "2025-06-30T08:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### Crear Tipo
**POST** `/api/tipos-habitacion`

**Body:**
```json
{
  "nombre": "Suite Familiar",
  "descripcion": "Suite amplia para familias",
  "capacidad_maxima": 4,
  "precio_base": 200.00,
  "servicios": "WiFi, TV, Aire acondicionado, Minibar"
}
```

### Habitaciones

#### Listar Habitaciones
**GET** `/api/habitaciones`

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "numero": "101",
      "piso": 1,
      "estado": "libre",
      "precio_noche": "85.00",
      "descripcion": "Habitación en primer piso",
      "tipo_nombre": "Habitación Simple",
      "tipo_descripcion": "Habitación individual",
      "capacidad_maxima": 1,
      "servicios": "WiFi, TV, Baño privado"
    }
  ],
  "total": 1
}
```

#### Crear Habitación
**POST** `/api/habitaciones`

**Body:**
```json
{
  "numero": "102",
  "piso": 1,
  "tipo_habitacion_id": 1,
  "precio_noche": 90.00,
  "descripcion": "Habitación con vista al jardín"
}
```

#### Obtener Habitación Específica
**GET** `/api/habitaciones/[id]`

#### Actualizar Habitación
**PUT** `/api/habitaciones/[id]`

**Body (ejemplo cambio de estado):**
```json
{
  "estado": "ocupada"
}
```

**Estados válidos y transiciones:**
- `libre` → `ocupada`, `reservada`, `mantenimiento`
- `ocupada` → `libre`, `mantenimiento`
- `reservada` → `ocupada`, `libre`, `mantenimiento`
- `mantenimiento` → `libre`

#### Eliminar Habitación
**DELETE** `/api/habitaciones/[id]`

**Restricciones:**
- No se puede eliminar si tiene reservas activas
- No se puede eliminar si está ocupada

## 💼 Flujo de Negocio

### 1. Proceso de Reserva

```mermaid
graph TD
    A[Cliente completa formulario] --> B[Sube comprobante de pago]
    B --> C[Sistema crea reserva PENDIENTE]
    C --> D[Staff revisa comprobante]
    D --> E{¿Aprobado?}
    E -->|Sí| F[Reserva CONFIRMADA]
    E -->|No| G[Reserva CANCELADA]
    F --> H[Habitación RESERVADA]
    H --> I[Check-in: Habitación OCUPADA]
    I --> J[Check-out: Habitación LIBRE]
    G --> K[Habitación permanece LIBRE]
```

### 2. Estados de Habitación

- **LIBRE:** Disponible para reservar
- **RESERVADA:** Reservada pero cliente no ha llegado
- **OCUPADA:** Cliente hospedado actualmente
- **MANTENIMIENTO:** Fuera de servicio temporalmente

### 3. Roles de Usuario

- **ADMIN:** Acceso completo al sistema
- **STAFF:** Gestión de reservas y habitaciones
- **CLIENTE:** Solo formulario de reserva (sin login)

## 🛠️ Desarrollo

### Estructura del Proyecto

```
hotel-paraiso-backend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── tipos-habitacion/
│   │   │   │   └── route.ts
│   │   │   ├── habitaciones/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   └── ... (futuras APIs)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       └── database.ts
├── test-apis.ps1
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

### Convenciones de Código

1. **Nombres de archivos:** kebab-case para rutas, camelCase para funciones
2. **Respuestas API:** Siempre incluir `success`, `message`, `data`
3. **Manejo de errores:** Try-catch con logs detallados
4. **Validaciones:** Validar datos de entrada antes de BD
5. **SQL:** Usar parámetros preparados ($1, $2, etc.)

### Scripts de Prueba

El proyecto incluye `test-apis.ps1` para probar todas las APIs:

```bash
# Ejecutar pruebas
./test-apis.ps1
```

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor desarrollo
npm run build        # Build producción
npm run start        # Servidor producción

# Base de datos
fly proxy 5433:5432 -a paraisobd-db  # Proxy BD
```

## 🚀 Despliegue

### Fly.io (Base de Datos)

La base de datos ya está desplegada en Fly.io:
- **App:** paraisobd-db
- **Región:** Configurada automáticamente
- **Backups:** Automáticos

### Vercel (Recomendado para Backend)

1. **Conectar repositorio** a Vercel
2. **Configurar variables de entorno:**
   ```
   DATABASE_URL=postgres://postgres:ehsWijNq5CGG9lv@paraisobd-db.flycast:5432
   NEXTAUTH_SECRET=tu-secret-key
   NEXTAUTH_URL=https://tu-dominio.vercel.app
   ```
3. **Deploy automático** con cada push

### Variables de Entorno Requeridas

```bash
# Base de datos
DATABASE_URL=postgres://...

# Autenticación
NEXTAUTH_SECRET=secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google Drive (futuro)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Configuración app
NODE_ENV=production
```

## 🎯 Próximos Pasos

### Fase 1: Completar APIs Base
- [ ] API de usuarios y autenticación
- [ ] API de clientes
- [ ] API de reservas
- [ ] Middleware de autenticación

### Fase 2: Lógica de Negocio
- [ ] Validación de disponibilidad de habitaciones
- [ ] Sistema de notificaciones
- [ ] Cálculo automático de precios
- [ ] Generación de códigos de reserva

### Fase 3: Servicios Externos
- [ ] Integración con Google Drive
- [ ] Generación de PDFs con PDFkit
- [ ] Sistema de emails
- [ ] Backup automático

### Fase 4: Frontend
- [ ] Panel de administración
- [ ] Formulario público de reservas
- [ ] Dashboard de estadísticas
- [ ] App móvil (opcional)

### Fase 5: Optimizaciones
- [ ] Cache con Redis
- [ ] Logs estructurados
- [ ] Monitoreo y alertas
- [ ] Tests automatizados

## 📞 Soporte y Contacto

Para preguntas sobre el proyecto:

1. **Documentación:** Revisar este README
2. **Código:** Comentarios en línea en archivos fuente
3. **Base de datos:** Usar health check para verificar conexión
4. **APIs:** Probar con test-apis.ps1

## 📄 Licencia

Este proyecto es propietario del Hotel Paraíso.

---

## Consultas SQL útiles para verificar facturas

-- Listar todas las facturas con datos de cliente y reserva
SELECT fc.id, fc.codigo_factura, fc.fecha_emision, fc.subtotal, fc.impuestos, fc.total, fc.estado,
       r.codigo_reserva, r.fecha_entrada, r.fecha_salida,
       c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
FROM facturas_cabecera fc
JOIN reservas r ON fc.reserva_id = r.id
JOIN clientes c ON r.cliente_id = c.id
ORDER BY fc.fecha_emision DESC;

-- Ver líneas de factura para una factura específica (reemplaza :factura_id)
SELECT fl.id, fl.descripcion, fl.cantidad, fl.precio_unitario, fl.subtotal
FROM facturas_lineas fl
WHERE fl.factura_id = :factura_id
ORDER BY fl.id;

-- Verificar el total de la factura y la suma de líneas
SELECT fc.id, fc.total, SUM(fl.subtotal) AS suma_lineas
FROM facturas_cabecera fc
JOIN facturas_lineas fl ON fl.factura_id = fc.id
GROUP BY fc.id, fc.total
ORDER BY fc.id DESC;

**🎉 ¡El sistema está listo para continuar el desarrollo!**

*Última actualización: Junio 2025*
