package com.autodrive.motors.dto;

import com.autodrive.motors.model.Mantenimiento;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MantenimientoResponse(
        Long id,
        Long vehiculoId,
        String vehiculoPlaca,
        LocalDate fecha,
        String descripcion,
        BigDecimal costo
) {
    public static MantenimientoResponse from(Mantenimiento m) {
        return new MantenimientoResponse(
                m.getId(),
                m.getVehiculo().getId(),
                m.getVehiculo().getPlaca(),
                m.getFecha(),
                m.getDescripcion(),
                m.getCosto());
    }
}
