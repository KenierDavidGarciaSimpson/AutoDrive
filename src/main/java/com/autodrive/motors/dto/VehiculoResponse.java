package com.autodrive.motors.dto;

import com.autodrive.motors.model.EstadoVehiculo;
import com.autodrive.motors.model.Vehiculo;

import java.math.BigDecimal;

public record VehiculoResponse(
        Long id,
        String placa,
        String marca,
        String modelo,
        Integer anio,
        BigDecimal precio,
        EstadoVehiculo estado
) {
    public static VehiculoResponse from(Vehiculo v) {
        return new VehiculoResponse(v.getId(), v.getPlaca(), v.getMarca(), v.getModelo(),
                v.getAnio(), v.getPrecio(), v.getEstado());
    }
}
