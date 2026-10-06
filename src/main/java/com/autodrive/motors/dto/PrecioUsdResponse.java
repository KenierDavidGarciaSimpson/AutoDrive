package com.autodrive.motors.dto;

import java.math.BigDecimal;

/** Respuesta de GET /vehiculos/{id}/precio-usd (acuerdo 9). */
public record PrecioUsdResponse(
        Long vehiculoId,
        String placa,
        BigDecimal precioCop,
        BigDecimal tasaCopPorUsd,
        BigDecimal precioUsd
) {
}
