package com.autodrive.motors.dto;

import com.autodrive.motors.model.EstadoVehiculo;
import jakarta.validation.constraints.NotNull;

public record EstadoRequest(
        @NotNull(message = "El estado es obligatorio")
        EstadoVehiculo estado
) {
}