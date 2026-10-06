CREATE TABLE clientes (
    id         BIGSERIAL     PRIMARY KEY,
    nombre     VARCHAR(100)  NOT NULL,
    documento  VARCHAR(20)   NOT NULL,
    correo     VARCHAR(100)  NOT NULL,
    telefono   VARCHAR(20),
    -- RN4: los clientes no pueden registrarse con correos repetidos
    CONSTRAINT uk_clientes_correo UNIQUE (correo)
);

CREATE TABLE vehiculos (
    id      BIGSERIAL      PRIMARY KEY,
    placa   VARCHAR(10)    NOT NULL,
    marca   VARCHAR(50)    NOT NULL,
    modelo  VARCHAR(50)    NOT NULL,
    anio    INTEGER        NOT NULL,
    precio  NUMERIC(15,2)  NOT NULL,
    estado  VARCHAR(20)    NOT NULL DEFAULT 'DISPONIBLE',
    -- RN3: la placa del vehiculo debe ser unica
    CONSTRAINT uk_vehiculos_placa  UNIQUE (placa),
    -- RN2: no se permiten precios negativos
    CONSTRAINT ck_vehiculos_precio CHECK (precio >= 0),
    -- Estados acordados por el grupo
    CONSTRAINT ck_vehiculos_estado CHECK (estado IN ('DISPONIBLE', 'VENDIDO', 'EN_MANTENIMIENTO'))
);

CREATE TABLE ventas (
    id           BIGSERIAL      PRIMARY KEY,
    fecha        TIMESTAMP      NOT NULL,   -- RN5: fecha automatica
    precio_base  NUMERIC(15,2)  NOT NULL,
    descuento    NUMERIC(15,2)  NOT NULL DEFAULT 0,   -- RN6: 5% si precio > 100.000.000
    total        NUMERIC(15,2)  NOT NULL,   -- RN5: total automatico
    cliente_id   BIGINT         NOT NULL,
    vehiculo_id  BIGINT         NOT NULL,
    CONSTRAINT ck_ventas_descuento CHECK (descuento >= 0),
    CONSTRAINT ck_ventas_total     CHECK (total >= 0),
    -- Un vehiculo solo puede venderse una vez (evita ventas duplicadas)
    CONSTRAINT uk_ventas_vehiculo  UNIQUE (vehiculo_id),
    -- Acuerdo 6: no se puede eliminar un cliente con ventas
    CONSTRAINT fk_ventas_cliente  FOREIGN KEY (cliente_id)
        REFERENCES clientes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_vehiculo FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos (id) ON DELETE RESTRICT
);

CREATE TABLE mantenimientos (
    id           BIGSERIAL      PRIMARY KEY,
    fecha        DATE           NOT NULL,
    descripcion  VARCHAR(255)   NOT NULL,
    costo        NUMERIC(15,2)  NOT NULL,
    vehiculo_id  BIGINT         NOT NULL,
    CONSTRAINT ck_mantenimientos_costo CHECK (costo >= 0),
    CONSTRAINT fk_mantenimientos_vehiculo FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos (id) ON DELETE RESTRICT
);
