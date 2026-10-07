-- Datos de ejemplo para AutoDrive Motors
-- Ejecutar DESPUES de autodrive_schema.sql, sobre la base autodrive_db.
-- Es seguro ejecutarlo mas de una vez: no duplica datos.
-- (Sin tildes a proposito, para evitar problemas de codificacion en Windows.)

INSERT INTO clientes (nombre, documento, correo, telefono) VALUES
  ('Carlos Ramirez', '1020304050', 'carlos.ramirez@correo.com', '3001112233'),
  ('Laura Gomez',    '1098765432', 'laura.gomez@correo.com',    '3012223344'),
  ('Andres Perez',   '1045678901', 'andres.perez@correo.com',   '3023334455'),
  ('Maria Torres',   '1032145698', 'maria.torres@correo.com',   '3034445566')
ON CONFLICT (correo) DO NOTHING;

INSERT INTO vehiculos (placa, marca, modelo, anio, precio, estado) VALUES
  ('ABC123', 'Toyota',    'Corolla',  2022,  85000000, 'DISPONIBLE'),
  ('DEF456', 'Mazda',     'CX-5',     2023, 135000000, 'DISPONIBLE'),
  ('GHI789', 'Chevrolet', 'Onix',     2021,  55000000, 'DISPONIBLE'),
  ('JKL012', 'Renault',   'Duster',   2022,  72000000, 'DISPONIBLE'),
  ('STU901', 'Mazda',     '3',        2021,  78000000, 'DISPONIBLE'),
  ('VWX234', 'BMW',       'X3',       2022, 210000000, 'DISPONIBLE'),
  ('MNO345', 'Kia',       'Sportage', 2023, 150000000, 'VENDIDO'),
  ('PQR678', 'Toyota',    'Hilux',    2020, 120000000, 'EN_MANTENIMIENTO')
ON CONFLICT (placa) DO NOTHING;

-- Venta con descuento del 5 % (150.000.000 > 100.000.000)
INSERT INTO ventas (fecha, precio_base, descuento, total, cliente_id, vehiculo_id)
SELECT NOW(), 150000000, 7500000, 142500000, c.id, v.id
FROM clientes c, vehiculos v
WHERE c.correo = 'laura.gomez@correo.com'
  AND v.placa = 'MNO345'
ON CONFLICT (vehiculo_id) DO NOTHING;

-- Mantenimiento del vehiculo que esta EN_MANTENIMIENTO
INSERT INTO mantenimientos (fecha, descripcion, costo, vehiculo_id)
SELECT DATE '2026-09-20', 'Cambio de frenos y alineacion', 1850000, v.id
FROM vehiculos v
WHERE v.placa = 'PQR678'
  AND NOT EXISTS (SELECT 1 FROM mantenimientos m WHERE m.vehiculo_id = v.id);
