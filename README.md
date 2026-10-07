# AutoDrive Motors — Sistema de Gestión Vehicular

API REST para el concesionario **AutoDrive Motors**. Gestiona clientes, vehículos, ventas y mantenimientos, aplica las reglas de negocio del concesionario y convierte el precio de los vehículos de pesos colombianos (COP) a dólares (USD) con una API pública de tasa de cambio.

Proyecto del parcial final de **Análisis y Diseño de Software** — Fundación Universitaria Colombo Internacional (Unicolombo).

## Tecnologías

| Tecnología | Versión / uso |
| --- | --- |
| Java | 17 |
| Spring Boot | 3.4.1 (Web, Data JPA, Validation) |
| JPA / Hibernate | Persistencia y relaciones entre entidades |
| PostgreSQL | Base de datos relacional |
| Maven | Gestión de dependencias y compilación |
| Postman | Pruebas de la API |
| API externa | [open.er-api.com](https://open.er-api.com) — tasa de cambio COP/USD |

## Estructura del proyecto

```
AutoDrive/
├── database/
│   └── autodrive_schema.sql        # Script que crea las 4 tablas
├── Diseno/                          # Documentación de análisis y diagramas
│   ├── AutoDrive_Analisis.docx      # RF, RNF, reglas de negocio e historias de usuario
│   ├── Diagrama_Casos_de_Uso_AutoDrive.png
│   ├── der_autodrive.png            # Diagrama Entidad-Relación
│   ├── modelo_relacional_autodrive.png
│   ├── diagrama_clases_autodrive.png
│   └── secuencia_registrar_*.png    # Diagramas de secuencia (venta, mantenimiento, cliente)
├── src/main/java/com/autodrive/motors/
│   ├── controller/                  # Endpoints REST
│   ├── service/                     # Reglas de negocio y transacciones
│   ├── repository/                  # Acceso a datos (Spring Data JPA)
│   ├── model/                       # Entidades JPA y enum EstadoVehiculo
│   ├── dto/                         # Objetos de entrada (Request) y salida (Response)
│   ├── exception/                   # Excepciones propias y manejador global
│   ├── client/                      # Cliente de la API de tasa de cambio
│   └── config/                      # Configuración del cliente HTTP
├── src/main/resources/
│   └── application.properties
├── AutoDrive_Motors.postman_collection.json      # Colección de pruebas
└── AutoDrive Motors - API REST.postman_test_run.json  # Resultado de la última ejecución
```

## Cómo ejecutarlo

### 1. Requisitos

- JDK 17 o superior.
- PostgreSQL (probado con la versión 18).
- Maven, o un IDE que lo traiga incluido, como NetBeans o IntelliJ.

### 2. Crear la base de datos

1. En PostgreSQL (por ejemplo, desde pgAdmin), crear una base de datos llamada `autodrive_db`.
2. Ejecutar sobre ella el script `database/autodrive_schema.sql`.

Las tablas se crean con este script, no con Hibernate: el proyecto usa `spring.jpa.hibernate.ddl-auto=validate`, que solo verifica que las entidades coincidan con la base de datos.

### 3. Configurar la contraseña

La contraseña de PostgreSQL **no está en el código**. Se lee de la variable de entorno `DB_PASSWORD`.

| Variable | Valor por defecto | Para qué |
| --- | --- | --- |
| `DB_PASSWORD` | (vacío) | Contraseña del usuario de PostgreSQL. **Obligatoria** |
| `DB_USER` | `postgres` | Usuario de PostgreSQL |
| `DB_URL` | `jdbc:postgresql://localhost:5432/autodrive_db` | Dirección de la base de datos |
| `TASA_CAMBIO_URL` | `https://open.er-api.com/v6/latest/USD` | API de tasa de cambio |

**En NetBeans:** clic derecho sobre el proyecto → **Properties → Actions → Run project** → en **Set Properties** agregar `Env.DB_PASSWORD=tu_contraseña`. En **Properties → Run**, la clase principal debe ser `com.autodrive.motors.AutodriveApplication`.

> NetBeans guarda esa configuración en `nbactions.xml`. No suban ese archivo al repositorio, porque contiene la contraseña.

**Desde la terminal (PowerShell):**

```powershell
$env:DB_PASSWORD="tu_contraseña"
mvn spring-boot:run
```

### 4. Verificar que arrancó

En la consola debe aparecer:

```
Started AutodriveApplication in ... seconds
```

La API queda disponible en `http://localhost:8080`.

## Endpoints

### Clientes

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/clientes` | Listar clientes |
| GET | `/clientes/{id}` | Consultar un cliente |
| POST | `/clientes` | Registrar un cliente |
| PUT | `/clientes/{id}` | Actualizar un cliente |
| DELETE | `/clientes/{id}` | Eliminar un cliente (solo si no tiene ventas) |

### Vehículos

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/vehiculos` | Listar vehículos |
| GET | `/vehiculos/disponibles` | Listar solo los vehículos DISPONIBLE |
| GET | `/vehiculos/marca/{marca}` | Listar por marca |
| GET | `/vehiculos/{id}` | Consultar un vehículo |
| GET | `/vehiculos/{id}/precio-usd` | Precio del vehículo convertido a USD |
| POST | `/vehiculos` | Registrar un vehículo (queda DISPONIBLE) |
| PUT | `/vehiculos/{id}` | Actualizar un vehículo; también devuelve a DISPONIBLE un vehículo que terminó su mantenimiento |
| DELETE | `/vehiculos/{id}` | Eliminar un vehículo (solo si no tiene ventas ni mantenimientos) |

### Ventas

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/ventas` | Registrar una venta; solo recibe `clienteId` y `vehiculoId` |
| GET | `/ventas` | Listar ventas |

### Mantenimientos

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/mantenimientos` | Registrar un mantenimiento; el vehículo pasa a EN_MANTENIMIENTO |
| GET | `/mantenimientos` | Listar mantenimientos |
| GET | `/mantenimientos/vehiculo/{vehiculoId}` | Historial de mantenimientos de un vehículo |

### Tasa de cambio

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/tasa-cambio` | Tasa actual de COP por USD |

### Ejemplos

Registrar un vehículo:

```json
POST /vehiculos
{
  "placa": "ABC123",
  "marca": "Toyota",
  "modelo": "Land Cruiser",
  "anio": 2024,
  "precio": 150000000
}
```

Registrar una venta:

```json
POST /ventas
{
  "clienteId": 1,
  "vehiculoId": 1
}
```

Respuesta (201): la fecha, el descuento y el total se calculan automáticamente.

```json
{
  "id": 1,
  "clienteId": 1,
  "clienteNombre": "Ana Torres",
  "vehiculoId": 1,
  "vehiculoPlaca": "ABC123",
  "fecha": "2026-10-07T14:47:20",
  "precioBase": 150000000.00,
  "descuento": 7500000.00,
  "total": 142500000.00
}
```

## Reglas de negocio

| Regla | Cómo se cumple |
| --- | --- |
| RN1: no se vende un vehículo VENDIDO o EN_MANTENIMIENTO | El servicio de ventas revisa el estado y responde 409 |
| RN2: no se permiten precios negativos | Validación en el DTO (400) y `CHECK` en la base de datos |
| RN3: la placa es única | Validación en el servicio (409) y `UNIQUE` en la base de datos |
| RN4: el correo del cliente es único | Validación en el servicio (409) y `UNIQUE` en la base de datos |
| RN5: fecha y total automáticos | La fecha se asigna al guardar la venta; el total se calcula en el servicio |
| RN6: 5% de descuento si el precio supera $100.000.000 COP | Se aplica solo si el precio es estrictamente mayor; con exactamente $100.000.000 no hay descuento |

Decisiones del equipo sobre lo que el enunciado no definía:

- Un vehículo vuelve a DISPONIBLE después del mantenimiento con `PUT /vehiculos/{id}`.
- No se registra mantenimiento a un vehículo VENDIDO ni a uno que ya está EN_MANTENIMIENTO.
- No se elimina un cliente con ventas, ni un vehículo con ventas o mantenimientos, para conservar el historial.
- El precio en USD tiene su propio endpoint, para que una falla de la API externa no afecte las demás consultas.

## Manejo de errores

Todos los errores responden con el mismo formato:

```json
{
  "fecha": "2026-10-07T14:47:20",
  "estado": 409,
  "mensaje": "El vehículo ya fue vendido"
}
```

| Código | Cuándo |
| --- | --- |
| 400 | Datos inválidos (campos vacíos, correo mal escrito, precio negativo) |
| 404 | El cliente o vehículo no existe |
| 409 | Se incumple una regla de negocio |
| 503 | La API de tasa de cambio no responde |
| 500 | Error inesperado (sin exponer detalles internos) |

## Pruebas

### Postman

1. Importar `AutoDrive_Motors.postman_collection.json` en Postman.
2. Con el proyecto corriendo, abrir la colección y hacer clic en **Run**.

La colección tiene **44 peticiones con 72 pruebas automáticas** en 6 carpetas, que deben ejecutarse en orden: clientes, vehículos, tasa de cambio, ventas, mantenimientos y eliminaciones. Cubre los casos exitosos y los casos de error de cada regla de negocio. Las placas y correos se generan nuevos en cada ejecución, así que se puede correr varias veces.

Resultado de la última ejecución: **72 de 72 pruebas aprobadas** (ver `AutoDrive Motors - API REST.postman_test_run.json`).

### Pruebas unitarias

`VentaServiceTest` verifica el cálculo del descuento: precio menor, igual y mayor a $100.000.000.

```powershell
mvn test
```

## Documentación

En la carpeta `Diseno/`:

- Requerimientos funcionales, no funcionales, reglas de negocio e historias de usuario (`AutoDrive_Analisis.docx`).
- Diagrama de casos de uso.
- Diagrama de clases.
- Diagramas de secuencia: registrar venta, registrar mantenimiento y registrar cliente.
- Modelo relacional y DER.

## Integrantes

- Kenier David García Simpson
- Manuel Martínez Padilla
- Sebastián Carrillo Nossa
