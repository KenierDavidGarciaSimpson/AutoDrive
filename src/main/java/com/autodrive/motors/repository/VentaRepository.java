package com.autodrive.motors.repository;

import com.autodrive.motors.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VentaRepository extends JpaRepository<Venta, Long> {

    // Acuerdo 7: no se elimina un cliente con ventas
    boolean existsByClienteId(Long clienteId);

    // Acuerdos 3 y 8: un vehículo solo se vende una vez / no se elimina si tiene ventas
    boolean existsByVehiculoId(Long vehiculoId);
}
