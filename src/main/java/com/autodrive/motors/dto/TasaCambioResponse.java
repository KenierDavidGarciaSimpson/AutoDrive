package com.autodrive.motors.dto;

import java.math.BigDecimal;

public record TasaCambioResponse(
        String monedaOrigen,
        String monedaDestino,
        BigDecimal copPorUsd,
        BigDecimal usdPorCop
) {
}
