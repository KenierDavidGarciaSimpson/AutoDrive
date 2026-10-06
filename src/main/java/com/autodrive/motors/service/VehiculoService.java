package com.autodrive.motors.service;

import com.autodrive.motors.client.TasaCambioClient;
import com.autodrive.motors.dto.PrecioUsdResponse;
import com.autodrive.motors.dto.VehiculoRequest;
import com.autodrive.motors.dto.VehiculoResponse;
import com.autodrive.motors.exception.RecursoNoEncontradoException;
import com.autodrive.motors.exception.ReglaNegocioException;
import com.autodrive.motors.model.EstadoVehiculo;
import com.autodrive.motors.model.Vehiculo;
import com.autodrive.motors.repository.MantenimientoRepository;
import com.autodrive.motors.repository.VehiculoRepository;
import com.autodrive.motors.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class VehiculoService {

    private final VehiculoRepository vehiculoRepository;
    private final VentaRepository ventaRepository;
    private final MantenimientoRepository mantenimientoRepository;
    private final TasaCambioClient tasaCambioClient;

    public VehiculoService(VehiculoRepository vehiculoRepository,
                           VentaRepository ventaRepository,
                           MantenimientoRepository mantenimientoRepository,
                           TasaCambioClient tasaCambioClient) {
        this.vehiculoRepository = vehiculoRepository;
        this.ventaRepository = ventaRepository;
        this.mantenimientoRepository = mantenimientoRepository;
        this.tasaCambioClient = tasaCambioClient;
    }

    @Transactional
    public VehiculoResponse crear(VehiculoRequest req) {
        String placa = normalizarPlaca(req.placa());

        // RN03: placa única
        if (vehiculoRepository.existsByPlaca(placa)) {
            throw new ReglaNegocioException("Ya existe un vehículo con la placa " + placa);
        }

        Vehiculo vehiculo = new Vehiculo();
        copiarDatos(vehiculo, req, placa);
        vehiculo.setEstado(EstadoVehiculo.DISPONIBLE); // al registrar siempre queda DISPONIBLE

        return VehiculoResponse.from(vehiculoRepository.save(vehiculo));
    }

    @Transactional(readOnly = true)
    public List<VehiculoResponse> listar() {
        return vehiculoRepository.findAll().stream().map(VehiculoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public VehiculoResponse buscarPorId(Long id) {
        return VehiculoResponse.from(obtener(id));
    }

    @Transactional(readOnly = true)
    public List<VehiculoResponse> buscarPorMarca(String marca) {
        return vehiculoRepository.findByMarcaIgnoreCase(marca.trim())
                .stream().map(VehiculoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<VehiculoResponse> listarDisponibles() {
        return vehiculoRepository.findByEstado(EstadoVehiculo.DISPONIBLE)
                .stream().map(VehiculoResponse::from).toList();
    }

    @Transactional
    public VehiculoResponse actualizar(Long id, VehiculoRequest req) {
        // Se bloquea el vehículo para que no cambie su estado a la vez desde una venta
        Vehiculo vehiculo = vehiculoRepository.findByIdParaActualizar(id)
                .orElseThrow(() -> RecursoNoEncontradoException.de("Vehículo", id));
        String placa = normalizarPlaca(req.placa());

        if (vehiculoRepository.existsByPlacaAndIdNot(placa, id)) {
            throw new ReglaNegocioException("Ya existe otro vehículo con la placa " + placa);
        }

        copiarDatos(vehiculo, req, placa);

        // Acuerdo 5: así el vehículo vuelve a DISPONIBLE después de un mantenimiento
        if (req.estado() != null && req.estado() != vehiculo.getEstado()) {
            cambiarEstado(vehiculo, req.estado());
        }

        return VehiculoResponse.from(vehiculoRepository.save(vehiculo));
    }

    @Transactional
    public void eliminar(Long id) {
        Vehiculo vehiculo = obtener(id);

        // Acuerdo 8: no se elimina un vehículo con ventas o mantenimientos
        if (ventaRepository.existsByVehiculoId(id) || mantenimientoRepository.existsByVehiculoId(id)) {
            throw new ReglaNegocioException(
                    "No se puede eliminar el vehículo porque tiene ventas o mantenimientos asociados");
        }

        vehiculoRepository.delete(vehiculo);
    }

    /** Acuerdo 9: GET /vehiculos/{id}/precio-usd. Si la API externa falla se responde 503. */
    public PrecioUsdResponse consultarPrecioUsd(Long id) {
        Vehiculo vehiculo = obtener(id);

        BigDecimal tasa = tasaCambioClient.obtenerTasa();
        BigDecimal precioUsd = tasaCambioClient.convertirAUsd(vehiculo.getPrecio(), tasa);

        return new PrecioUsdResponse(vehiculo.getId(), vehiculo.getPlaca(),
                vehiculo.getPrecio(), tasa, precioUsd);
    }

    // ---------- auxiliares ----------

    private Vehiculo obtener(Long id) {
        return vehiculoRepository.findById(id)
                .orElseThrow(() -> RecursoNoEncontradoException.de("Vehículo", id));
    }

    private String normalizarPlaca(String placa) {
        return placa.trim().toUpperCase();
    }

    private void copiarDatos(Vehiculo vehiculo, VehiculoRequest req, String placa) {
        vehiculo.setPlaca(placa);
        vehiculo.setMarca(req.marca().trim());
        vehiculo.setModelo(req.modelo().trim());
        vehiculo.setAnio(req.anio());
        vehiculo.setPrecio(req.precio());
    }

    /**
     * Un vehículo VENDIDO no cambia de estado, y solo una venta lo deja en VENDIDO.
     * Entre DISPONIBLE y EN_MANTENIMIENTO se puede cambiar libremente.
     */
    private void cambiarEstado(Vehiculo vehiculo, EstadoVehiculo nuevoEstado) {
        if (vehiculo.getEstado() == EstadoVehiculo.VENDIDO) {
            throw new ReglaNegocioException("No se puede cambiar el estado de un vehículo vendido");
        }
        if (nuevoEstado == EstadoVehiculo.VENDIDO) {
            throw new ReglaNegocioException("Un vehículo solo pasa a VENDIDO al registrar una venta");
        }
        vehiculo.setEstado(nuevoEstado);
    }
}
