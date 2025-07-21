# API Hotel Paraíso Verde

## Autenticación
- **POST** `/api/auth/login` - Login de usuarios
- **POST** `/api/auth/logout` - Logout de usuarios

## Usuarios
- **GET** `/api/usuarios` - Listar usuarios
- **POST** `/api/usuarios` - Crear usuario
- **GET** `/api/usuarios/[id]` - Obtener usuario específico
- **PUT** `/api/usuarios/[id]` - Actualizar usuario
- **DELETE** `/api/usuarios/[id]` - Eliminar usuario

## Habitaciones
- **GET** `/api/habitaciones` - Listar habitaciones
- **POST** `/api/habitaciones` - Crear habitación
- **GET** `/api/habitaciones/[id]` - Obtener habitación específica
- **PUT** `/api/habitaciones/[id]` - Actualizar habitación
- **DELETE** `/api/habitaciones/[id]` - Eliminar habitación

## Tipos de Habitación
- **GET** `/api/tipos-habitacion` - Listar tipos de habitación
- **POST** `/api/tipos-habitacion` - Crear tipo de habitación
- **GET** `/api/tipos-habitacion/[id]` - Obtener tipo específico
- **PUT** `/api/tipos-habitacion/[id]` - Actualizar tipo
- **DELETE** `/api/tipos-habitacion/[id]` - Eliminar tipo

## Reservas
- **GET** `/api/reservas` - Listar reservas
- **POST** `/api/reservas` - Crear reserva
- **GET** `/api/reservas/[id]` - Obtener reserva específica
- **PUT** `/api/reservas/[id]` - Actualizar reserva
- **DELETE** `/api/reservas/[id]` - Cancelar reserva

## Comprobantes de Pago
- **GET** `/api/comprobantes` - Listar comprobantes
- **POST** `/api/comprobantes` - Subir comprobante
- **GET** `/api/comprobantes/[id]` - Obtener comprobante específico
- **PUT** `/api/comprobantes/[id]` - Actualizar estado del comprobante
- **DELETE** `/api/comprobantes/[id]` - Eliminar comprobante

## Facturas
- **GET** `/api/facturas` - Listar facturas
- **POST** `/api/facturas` - Generar nueva factura
- **GET** `/api/facturas/[id]` - Obtener factura específica
- **PUT** `/api/facturas/[id]` - Actualizar estado de factura
- **DELETE** `/api/facturas/[id]` - Anular factura

## Estadísticas
- **GET** `/api/estadisticas` - Obtener estadísticas del hotel

## Clientes
- **GET** `/api/clientes` - Listar clientes
- **POST** `/api/clientes` - Crear cliente
- **GET** `/api/clientes/[id]` - Obtener cliente específico
- **PUT** `/api/clientes/[id]` - Actualizar cliente
- **DELETE** `/api/clientes/[id]` - Eliminar cliente

## Disponibilidad
- **GET** `/api/disponibilidad` - Verificar disponibilidad de habitaciones

## Upload
- **POST** `/api/upload` - Subir archivos a Google Drive

## Health Check
- **GET** `/api/health` - Verificar estado del servidor

## Seed Data
- **POST** `/api/seed` - Poblar base de datos con datos de prueba

---

## Detalles de Endpoints

### Autenticación

#### POST /api/auth/login
```json
{
  "email": "admin@hotel.com",
  "password": "admin123"
}
```

### Reservas

#### POST /api/reservas
```json
{
  "cliente_id": 1,
  "fecha_checkin": "2024-01-15",
  "fecha_checkout": "2024-01-18",
  "habitaciones": [
    {
      "habitacion_id": 1,
      "precio_noche": 150.00
    }
  ],
  "observaciones": "Check-in temprano"
}
```

### Facturas

#### POST /api/facturas
```json
{
  "reserva_id": 1
}
```

### Comprobantes

#### POST /api/comprobantes
```json
{
  "reserva_id": 1,
  "monto": 450.00,
  "metodo_pago": "transferencia",
  "observaciones": "Pago realizado"
}
```

### Estadísticas

#### GET /api/estadisticas
Parámetros opcionales:
- `periodo`: "semana", "mes", "año"
- `fecha_inicio`: "2024-01-01"
- `fecha_fin`: "2024-01-31"

---

## Estados

### Reservas
- `pendiente`
- `confirmada`
- `cancelada`
- `completada`

### Habitaciones
- `disponible`
- `ocupada`
- `mantenimiento`
- `reservada`

### Comprobantes
- `pendiente`
- `aprobado`
- `rechazado`

### Facturas
- `borrador`
- `emitida`
- `pagada`
- `anulada`

---

## Respuestas

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "data": [...],
  "message": "Operación exitosa"
}
```

En caso de error:

```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles técnicos"
}
```
