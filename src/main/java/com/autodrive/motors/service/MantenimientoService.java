package com.autodrive.motors.service;

import com.autodrive.motors.dto.MantenimientoRequest;
import com.autodrive.motors.dto.MantenimientoResponse;
import com.autodrive.motors.exception.RecursoNoEncontradoException;
import com.autodrive.motors.exception.ReglaNegocioException;
import com.autodrive.motors.model.EstadoVehiculo;
import com.autodrive.motors.model.Mantenimiento;
import com.autodrive.motors.model.Vehiculo;
import com.autodrive.motors.repository.MantenimientoRepository;
import com.autodrive.motors.repository.VehiculoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class MantenimientoService {

    private final MantenimientoRepository mantenimientoRepository;
    private final VehiculoRepository vehiculoRepository;

    public MantenimientoService(MantenimientoRepository mantenimientoRepository,
                                VehiculoRepository vehiculoRepository) {
        this.mantenimientoRepository = mantenimientoRepository;
        this.vehiculoRepository = vehiculoRepository;
    }

    @Transactional
    public MantenimientoResponse registrar(MantenimientoRequest req) {
        // Se bloquea el vehículo mientras se registra el mantenimiento
        Vehiculo vehiculo = vehiculoRepository.findByIdParaActualizar(req.vehiculoId())
                .orElseThrow(() -> RecursoNoEncontradoException.de("Vehículo", req.vehiculoId()));

        // Acuerdo 6: no se registra mantenimiento a un vehículo vendido (409)
        if (vehiculo.getEstado() == EstadoVehiculo.VENDIDO) {
            throw new ReglaNegocioException("No se puede registrar mantenimiento: el vehículo ya fue vendido");
        }
        if (vehiculo.getEstado() == EstadoVehiculo.EN_MANTENIMIENTO) {
            throw new ReglaNegocioException("El vehículo ya se encuentra en mantenimiento");
        }

        Mantenimiento mantenimiento = new Mantenimiento();
        mantenimiento.setVehiculo(vehiculo);
        mantenimiento.setFecha(req.fecha() != null ? req.fecha() : LocalDate.now());
        mantenimiento.setDescripcion(req.descripcion().trim());
        mantenimiento.setCosto(req.costo());

        // El vehículo pasa a EN_MANTENIMIENTO (vuelve a DISPONIBLE con PUT /vehiculos/{id})
        vehiculo.setEstado(EstadoVehiculo.EN_MANTENIMIENTO);

        return MantenimientoResponse.from(mantenimientoRepository.save(mantenimiento));
    }

    @Transactional(readOnly = true)
    public List<MantenimientoResponse> listar() {
        return mantenimientoRepository.findAll(Sort.by(Sort.Direction.DESC, "fecha", "id"))
                .stream().map(MantenimientoResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<MantenimientoResponse> historialPorVehiculo(Long vehiculoId) {
        if (!vehiculoRepository.existsById(vehiculoId)) {
            throw RecursoNoEncontradoException.de("Vehículo", vehiculoId);
        }
        return mantenimientoRepository.findByVehiculoIdOrderByFechaDescIdDesc(vehiculoId)
                .stream().map(MantenimientoResponse::from).toList();
    }
}
