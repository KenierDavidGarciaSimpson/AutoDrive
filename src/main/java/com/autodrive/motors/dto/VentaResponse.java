package com.autodrive.motors.dto;

import com.autodrive.motors.model.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VentaResponse(
        Long id,
        Long clienteId,
        String clienteNombre,
        Long vehiculoId,
        String vehiculoPlaca,
        LocalDateTime fecha,
        BigDecimal precioBase,
        BigDecimal descuento,
        BigDecimal total
) {
    public static VentaResponse from(Venta v) {
        return new VentaResponse(
                v.getId(),
                v.getCliente().getId(),
                v.getCliente().getNombre(),
                v.getVehiculo().getId(),
                v.getVehiculo().getPlaca(),
                v.getFecha(),
                v.getPrecioBase(),
                v.getDescuento(),
                v.getTotal());
    }
}
