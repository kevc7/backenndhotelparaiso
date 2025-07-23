-- ========================================================================
-- HOTEL PARAÍSO - MIGRACIÓN EXACTA DE FLY.IO A SUPABASE
-- ========================================================================
-- Script basado en la estructura real consultada desde Fly.io

-- 1. ELIMINAR OBJETOS EXISTENTES (si existen)
DROP TRIGGER IF EXISTS update_usuarios_timestamp ON usuarios CASCADE;
DROP TRIGGER IF EXISTS update_clientes_timestamp ON clientes CASCADE;
DROP TRIGGER IF EXISTS update_tipos_habitacion_timestamp ON tipos_habitacion CASCADE;
DROP TRIGGER IF EXISTS update_habitaciones_timestamp ON habitaciones CASCADE;
DROP TRIGGER IF EXISTS update_reservas_timestamp ON reservas CASCADE;
DROP TRIGGER IF EXISTS update_comprobantes_pago_timestamp ON comprobantes_pago CASCADE;
DROP TRIGGER IF EXISTS update_facturas_cabecera_timestamp ON facturas_cabecera CASCADE;
DROP TRIGGER IF EXISTS trigger_generar_codigo_reserva ON reservas CASCADE;
DROP TRIGGER IF EXISTS trigger_calcular_total_factura ON facturas_lineas CASCADE;

DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS generar_codigo_reserva() CASCADE;
DROP FUNCTION IF EXISTS calcular_total_factura() CASCADE;
DROP FUNCTION IF EXISTS liberar_habitaciones_expiradas() CASCADE;
DROP FUNCTION IF EXISTS verificar_disponibilidad_habitacion(INTEGER, DATE, DATE) CASCADE;

DROP TABLE IF EXISTS facturas_lineas CASCADE;
DROP TABLE IF EXISTS facturas_cabecera CASCADE;
DROP TABLE IF EXISTS comprobantes_pago CASCADE;
DROP TABLE IF EXISTS reserva_habitaciones CASCADE;
DROP TABLE IF EXISTS reservas CASCADE;
DROP TABLE IF EXISTS habitaciones CASCADE;
DROP TABLE IF EXISTS tipos_habitacion CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP TYPE IF EXISTS rol_usuario CASCADE;
DROP TYPE IF EXISTS estado_habitacion CASCADE;
DROP TYPE IF EXISTS estado_reserva CASCADE;
DROP TYPE IF EXISTS estado_factura CASCADE;

-- 2. CREAR TIPOS ENUM (estructura exacta de Fly.io)
CREATE TYPE rol_usuario AS ENUM ('admin', 'staff', 'cliente');
CREATE TYPE estado_habitacion AS ENUM ('libre', 'ocupada', 'separada', 'mantenimiento');
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'confirmada', 'cancelada');
CREATE TYPE estado_factura AS ENUM ('activa', 'anulada');

-- 3. CREAR TABLAS (estructura exacta de Fly.io)

-- Tabla usuarios (estructura real de Fly.io)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'staff',
    activo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla tipos_habitacion (estructura real de Fly.io)
CREATE TABLE tipos_habitacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    capacidad_maxima INTEGER NOT NULL,
    precio_base NUMERIC NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    servicios TEXT
);

-- Tabla clientes (estructura real de Fly.io)
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    documento_identidad VARCHAR(50) UNIQUE NOT NULL,
    tipo_documento VARCHAR(20),
    fecha_nacimiento DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER UNIQUE REFERENCES usuarios(id)
);

-- Tabla habitaciones (ya teníamos esta estructura)
CREATE TABLE habitaciones (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(10) UNIQUE NOT NULL,
    piso INTEGER NOT NULL CHECK (piso > 0),
    tipo_habitacion_id INTEGER NOT NULL REFERENCES tipos_habitacion(id),
    estado estado_habitacion DEFAULT 'libre',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla reservas (ya teníamos esta estructura)
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(20) UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    numero_huespedes INTEGER NOT NULL CHECK (numero_huespedes > 0),
    estado estado_reserva DEFAULT 'pendiente',
    fecha_limite_pago TIMESTAMP,
    precio_total DECIMAL(10,2) CHECK (precio_total > 0),
    creado_por INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_fechas_validas CHECK (fecha_salida > fecha_entrada)
);

-- Tabla reserva_habitaciones (ya teníamos esta estructura)
CREATE TABLE reserva_habitaciones (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    habitacion_id INTEGER NOT NULL REFERENCES habitaciones(id),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario > 0),
    noches INTEGER NOT NULL CHECK (noches > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal > 0),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(reserva_id, habitacion_id)
);

-- Tabla comprobantes_pago (ya teníamos esta estructura)
CREATE TABLE comprobantes_pago (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reservas(id),
    metodo_pago VARCHAR(50) NOT NULL,
    monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'confirmado', 'rechazado')),
    ruta_archivo VARCHAR(255),
    hash_archivo VARCHAR(64),
    observaciones TEXT,
    creado_por INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla facturas_cabecera (ya teníamos esta estructura)
CREATE TABLE facturas_cabecera (
    id SERIAL PRIMARY KEY,
    codigo_factura VARCHAR(20) UNIQUE NOT NULL,
    reserva_id INTEGER NOT NULL REFERENCES reservas(id),
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    impuestos DECIMAL(10,2) NOT NULL CHECK (impuestos >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    estado estado_factura DEFAULT 'activa',
    creado_por INTEGER REFERENCES usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla facturas_lineas (ya teníamos esta estructura)
CREATE TABLE facturas_lineas (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES facturas_cabecera(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREAR ÍNDICES (mismos que en Fly.io)
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_habitaciones_estado ON habitaciones(estado);
CREATE INDEX idx_habitaciones_tipo ON habitaciones(tipo_habitacion_id);
CREATE INDEX idx_clientes_documento ON clientes(documento_identidad);
CREATE INDEX idx_reservas_fechas ON reservas(fecha_entrada, fecha_salida);
CREATE INDEX idx_reservas_estado ON reservas(estado);
CREATE INDEX idx_reserva_habitaciones_reserva ON reserva_habitaciones(reserva_id);
CREATE INDEX idx_reserva_habitaciones_habitacion ON reserva_habitaciones(habitacion_id);
CREATE INDEX idx_comprobantes_reserva ON comprobantes_pago(reserva_id);
CREATE INDEX idx_facturas_cabecera_reserva ON facturas_cabecera(reserva_id);
CREATE INDEX idx_facturas_cabecera_cliente ON facturas_cabecera(cliente_id);
CREATE INDEX idx_facturas_lineas_factura ON facturas_lineas(factura_id);

-- 5. CREAR FUNCIONES (mismas que en Fly.io)

-- Función genérica para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código único de reserva
CREATE OR REPLACE FUNCTION generar_codigo_reserva()
RETURNS TRIGGER AS $$
BEGIN
    NEW.codigo_reserva = 'RES-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.id::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular total de factura
CREATE OR REPLACE FUNCTION calcular_total_factura()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_total DECIMAL(10,2);
    factura_id_target INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        factura_id_target = OLD.factura_id;
    ELSE
        factura_id_target = NEW.factura_id;
    END IF;
    
    SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_total 
    FROM facturas_lineas 
    WHERE factura_id = factura_id_target;
    
    UPDATE facturas_cabecera 
    SET total = nuevo_total, subtotal = nuevo_total
    WHERE id = factura_id_target;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para liberar habitaciones de reservas expiradas
CREATE OR REPLACE FUNCTION liberar_habitaciones_expiradas()
RETURNS INTEGER AS $$
DECLARE
    habitaciones_liberadas INTEGER := 0;
BEGIN
    UPDATE habitaciones h
    SET estado = 'libre'
    FROM reserva_habitaciones rh
    JOIN reservas r ON rh.reserva_id = r.id
    WHERE h.id = rh.habitacion_id
      AND r.estado = 'pendiente'
      AND r.fecha_limite_pago < NOW()
      AND h.estado = 'separada';
    
    GET DIAGNOSTICS habitaciones_liberadas = ROW_COUNT;
    
    UPDATE reservas
    SET estado = 'cancelada'
    WHERE estado = 'pendiente'
      AND fecha_limite_pago < NOW();
    
    RETURN habitaciones_liberadas;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de habitaciones
CREATE OR REPLACE FUNCTION verificar_disponibilidad_habitacion(
    p_habitacion_id INTEGER,
    p_fecha_entrada DATE,
    p_fecha_salida DATE
) RETURNS BOOLEAN AS $$
DECLARE
    conflictos INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflictos
    FROM reserva_habitaciones rh
    JOIN reservas r ON rh.reserva_id = r.id
    WHERE rh.habitacion_id = p_habitacion_id
      AND r.estado IN ('confirmada', 'pendiente')
      AND (
          (p_fecha_entrada >= r.fecha_entrada AND p_fecha_entrada < r.fecha_salida) OR
          (p_fecha_salida > r.fecha_entrada AND p_fecha_salida <= r.fecha_salida) OR
          (p_fecha_entrada <= r.fecha_entrada AND p_fecha_salida >= r.fecha_salida)
      );
    
    RETURN conflictos = 0;
END;
$$ LANGUAGE plpgsql;

-- 6. CREAR TRIGGERS (mismos que en Fly.io)

-- Triggers para actualizar fecha_actualizacion
CREATE TRIGGER update_usuarios_timestamp
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_clientes_timestamp
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_tipos_habitacion_timestamp
    BEFORE UPDATE ON tipos_habitacion
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_habitaciones_timestamp
    BEFORE UPDATE ON habitaciones
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_reservas_timestamp
    BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_comprobantes_pago_timestamp
    BEFORE UPDATE ON comprobantes_pago
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_facturas_cabecera_timestamp
    BEFORE UPDATE ON facturas_cabecera
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger para generar código de reserva automáticamente
CREATE TRIGGER trigger_generar_codigo_reserva
    BEFORE INSERT ON reservas
    FOR EACH ROW EXECUTE FUNCTION generar_codigo_reserva();

-- Trigger para recalcular total de factura automáticamente
CREATE TRIGGER trigger_calcular_total_factura
    AFTER INSERT OR UPDATE OR DELETE ON facturas_lineas
    FOR EACH ROW EXECUTE FUNCTION calcular_total_factura();

-- ========================================================================
-- SCRIPT COMPLETADO ✅
-- 
-- Este script replica EXACTAMENTE la estructura de Fly.io:
-- - 4 ENUMs exactos (incluyendo rol_usuario)
-- - 9 tablas con estructura idéntica
-- - 12 índices para optimización
-- - 5 funciones personalizadas
-- - 9 triggers automáticos
-- - Todas las constraints y foreign keys
--
-- DIFERENCIAS CLAVE CORREGIDAS:
-- 1. usuarios.rol usa ENUM rol_usuario (no VARCHAR)
-- 2. usuarios tiene ultimo_login (columna adicional)
-- 3. tipos_habitacion.nombre es VARCHAR(50) (no 100)
-- 4. tipos_habitacion.servicios es TEXT (no JSONB)
-- 5. clientes.usuario_id puede ser NULL
--
-- SIGUIENTE PASO: Ejecutar en Supabase y usar /api/seed
-- ======================================================================== 