-- ========================================================================
-- SCRIPT DE LIMPIEZA COMPLETA Y RECREACIÓN PASO A PASO
-- ========================================================================

-- PASO 1: LIMPIAR TODO (ejecutar primero)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todos los triggers
    FOR r IN (SELECT schemaname, tablename, triggername FROM pg_triggers WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.triggername) || ' ON ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Eliminar todas las funciones
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
    
    -- Eliminar todas las tablas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Eliminar todos los tipos
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') 
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Verificar que todo esté limpio
SELECT 'CLEANUP COMPLETE' as status;

-- ========================================================================
-- PASO 2: CREAR ENUMS (ejecutar después de limpiar)
-- ========================================================================

CREATE TYPE rol_usuario AS ENUM ('admin', 'staff', 'cliente');
CREATE TYPE estado_habitacion AS ENUM ('libre', 'ocupada', 'separada', 'mantenimiento');
CREATE TYPE estado_reserva AS ENUM ('pendiente', 'confirmada', 'cancelada');
CREATE TYPE estado_factura AS ENUM ('activa', 'anulada');

-- Verificar ENUMs creados
SELECT 'ENUMS CREATED' as status;
SELECT t.typname, e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
ORDER BY t.typname, e.enumsortorder;

-- ========================================================================
-- PASO 3: CREAR TABLAS (ejecutar después de crear ENUMs)
-- ========================================================================

-- Tabla usuarios
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

-- Tabla tipos_habitacion
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

-- Tabla clientes
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

-- Tabla habitaciones
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

-- Tabla reservas
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

-- Tabla reserva_habitaciones
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

-- Tabla comprobantes_pago
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

-- Tabla facturas_cabecera
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

-- Tabla facturas_lineas
CREATE TABLE facturas_lineas (
    id SERIAL PRIMARY KEY,
    factura_id INTEGER NOT NULL REFERENCES facturas_cabecera(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verificar tablas creadas
SELECT 'TABLES CREATED' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- ========================================================================
-- PASO 4: CREAR ÍNDICES (ejecutar después de crear tablas)
-- ========================================================================

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

SELECT 'INDEXES CREATED' as status;

-- ========================================================================
-- PASO 5: CREAR FUNCIONES Y TRIGGERS (ejecutar al final)
-- ========================================================================

-- Función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de reserva
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

-- Crear triggers
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

CREATE TRIGGER trigger_generar_codigo_reserva
    BEFORE INSERT ON reservas
    FOR EACH ROW EXECUTE FUNCTION generar_codigo_reserva();

CREATE TRIGGER trigger_calcular_total_factura
    AFTER INSERT OR UPDATE OR DELETE ON facturas_lineas
    FOR EACH ROW EXECUTE FUNCTION calcular_total_factura();

SELECT 'FUNCTIONS AND TRIGGERS CREATED' as status;

-- ========================================================================
-- VERIFICACIÓN FINAL
-- ========================================================================

SELECT 'SETUP COMPLETE!' as status;

-- Verificar estructura final
SELECT 'Tables:' as info, count(*) as cantidad FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT 'Functions:', count(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
UNION ALL  
SELECT 'Triggers:', count(*) FROM information_schema.triggers WHERE trigger_schema = 'public'
UNION ALL
SELECT 'ENUMs:', count(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e'; 