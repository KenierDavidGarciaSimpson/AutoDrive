package com.autodrive.motors.repository;

import com.autodrive.motors.model.EstadoVehiculo;
import com.autodrive.motors.model.Vehiculo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface VehiculoRepository extends JpaRepository<Vehiculo, Long> {

    // RN03: validar placa repetida
    boolean existsByPlaca(String placa);

    boolean existsByPlacaAndIdNot(String placa, Long id);

    // Consultar por marca sin distinguir mayúsculas
    List<Vehiculo> findByMarcaIgnoreCase(String marca);

    // Consultar disponibles
    List<Vehiculo> findByEstado(EstadoVehiculo estado);

    // Bloqueo pesimista: evita ventas o cambios simultáneos del mismo vehículo
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vehiculo v WHERE v.id = :id")
    Optional<Vehiculo> findByIdParaActualizar(@Param("id") Long id);
}
