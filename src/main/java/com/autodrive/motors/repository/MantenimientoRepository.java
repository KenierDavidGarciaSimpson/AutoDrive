package com.autodrive.motors.repository;

import com.autodrive.motors.model.Mantenimiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MantenimientoRepository extends JpaRepository<Mantenimiento, Long> {

    // Historial de un vehículo, del más reciente al más antiguo
    List<Mantenimiento> findByVehiculoIdOrderByFechaDescIdDesc(Long vehiculoId);

    // Acuerdo 8: no se elimina un vehículo con mantenimientos
    boolean existsByVehiculoId(Long vehiculoId);
}
