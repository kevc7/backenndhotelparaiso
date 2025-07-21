# 📚 Documentación de Endpoints y Base de Datos - Hotel Paraíso Backend

## Endpoints Disponibles

### 1. Health Check
- **GET `/api/health`**
  - Verifica el estado del sistema y la conexión a la base de datos.
  - **Respuesta:**
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
        "usuarios": "5",
        "habitaciones": [{"total": "12"}],
        "reservas": [{"total": "3"}]
      }
    }
    ```

---

### 2. Tipos de Habitación
- **GET `/api/tipos-habitacion`**
  - Lista todos los tipos de habitación disponibles.
  - **Respuesta:**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "nombre": "Habitación Simple",
          "descripcion": "Habitación individual con cama simple",
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
- **POST `/api/tipos-habitacion`**
  - Crea un nuevo tipo de habitación.
  - **Body:**
    ```json
    {
      "nombre": "Suite Presidencial",
      "descripcion": "La mejor suite del hotel",
      "capacidad_maxima": 6,
      "precio_base": 500.00,
      "servicios": "WiFi, TV 65', Baño de lujo, Jacuzzi"
    }
    ```
  - **Respuesta:**
    ```json
    {
      "success": true,
      "message": "Tipo de habitación creado exitosamente",
      "data": { ... }
    }
    ```

---

### 3. Habitaciones
- **GET `/api/habitaciones`**
  - Lista todas las habitaciones con información completa.
  - **Respuesta:**
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
          "fecha_creacion": "2025-06-30T08:10:00.000Z",
          "fecha_actualizacion": "2025-06-30T08:10:00.000Z",
          "tipo_id": 1,
          "tipo_nombre": "Habitación Simple",
          "tipo_descripcion": "Habitación individual",
          "capacidad_maxima": 1,
          "servicios": "WiFi, TV, Baño privado"
        }
      ],
      "total": 1
    }
    ```
- **POST `/api/habitaciones`**
  - Crea una nueva habitación.
  - **Body:**
    ```json
    {
      "numero": "301",
      "piso": 3,
      "tipo_habitacion_id": 2,
      "precio_noche": 250.00,
      "descripcion": "Suite familiar en tercer piso"
    }
    ```
- **GET `/api/habitaciones/[id]`**
  - Obtiene una habitación específica por ID.
- **PUT `/api/habitaciones/[id]`**
  - Actualiza una habitación existente (campos opcionales: numero, piso, estado, precio_noche, descripcion).
- **DELETE `/api/habitaciones/[id]`**
  - Elimina una habitación (no se puede si tiene reservas activas o está ocupada).

---

## Estructura de la Base de Datos

El sistema utiliza PostgreSQL y cuenta con las siguientes tablas principales:

### 1. tipos_habitacion
- id (SERIAL PRIMARY KEY)
- nombre (VARCHAR UNIQUE)
- descripcion (TEXT)
- capacidad_maxima (INTEGER)
- precio_base (DECIMAL)
- servicios (TEXT)
- fecha_creacion (TIMESTAMP)
- fecha_actualizacion (TIMESTAMP)

### 2. habitaciones
- id (SERIAL PRIMARY KEY)
- numero (VARCHAR UNIQUE)
- piso (INTEGER)
- tipo_habitacion_id (FOREIGN KEY)
- estado (ENUM: 'libre', 'ocupada', 'reservada', 'mantenimiento')
- descripcion (TEXT)
- fecha_creacion (TIMESTAMP)
- fecha_actualizacion (TIMESTAMP)

### 3. usuarios
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- password_hash (VARCHAR)
- nombre (VARCHAR)
- apellido (VARCHAR)
- rol (ENUM: 'admin', 'staff')
- activo (BOOLEAN)
- fecha_creacion (TIMESTAMP)

### 4. clientes
- id (SERIAL PRIMARY KEY)
- nombre (VARCHAR)
- apellido (VARCHAR)
- email (VARCHAR)
- telefono (VARCHAR)
- documento_identidad (VARCHAR)
- fecha_creacion (TIMESTAMP)

### 5. reservas
- id (SERIAL PRIMARY KEY)
- codigo_reserva (VARCHAR UNIQUE)
- cliente_id (FOREIGN KEY)
- fecha_checkin (DATE)
- fecha_checkout (DATE)
- estado (ENUM: 'pendiente', 'confirmada', 'cancelada')
- total_estimado (DECIMAL)
- observaciones (TEXT)
- fecha_creacion (TIMESTAMP)

### 6. reserva_habitaciones
- id (SERIAL PRIMARY KEY)
- reserva_id (FOREIGN KEY)
- habitacion_id (FOREIGN KEY)
- precio_noche (DECIMAL)
- fecha_asignacion (TIMESTAMP)

### 7. comprobantes_pago
- id (SERIAL PRIMARY KEY)
- reserva_id (FOREIGN KEY)
- tipo_comprobante (VARCHAR)
- monto (DECIMAL)
- fecha_pago (DATE)
- url_imagen (VARCHAR)
- estado_revision (ENUM: 'pendiente', 'aprobado', 'rechazado')
- observaciones_staff (TEXT)
- fecha_subida (TIMESTAMP)

### 8. facturas_cabecera
- id (SERIAL PRIMARY KEY)
- numero_factura (VARCHAR UNIQUE)
- reserva_id (FOREIGN KEY)
- fecha_emision (DATE)
- subtotal (DECIMAL)
- impuestos (DECIMAL)
- total (DECIMAL)
- estado (ENUM: 'borrador', 'emitida', 'pagada', 'anulada')
- url_pdf (VARCHAR)

### 9. facturas_lineas
- id (SERIAL PRIMARY KEY)
- factura_id (FOREIGN KEY)
- descripcion (VARCHAR)
- cantidad (INTEGER)
- precio_unitario (DECIMAL)
- subtotal (DECIMAL)

---

> **Nota:** Para más detalles sobre validaciones, flujos y ejemplos de respuesta, consulta los archivos `API.md` y `README.md` del proyecto. 