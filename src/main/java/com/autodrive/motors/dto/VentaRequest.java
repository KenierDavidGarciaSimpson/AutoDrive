package com.autodrive.motors.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record VentaRequest(
        @NotNull(message = "El id del cliente es obligatorio")
        @Positive(message = "El id del cliente no es válido")
        Long clienteId,

        @NotNull(message = "El id del vehículo es obligatorio")
        @Positive(message = "El id del vehículo no es válido")
        Long vehiculoId
) {
}
