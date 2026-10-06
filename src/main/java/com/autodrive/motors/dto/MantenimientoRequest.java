package com.autodrive.motors.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MantenimientoRequest(
        @NotNull(message = "El id del vehículo es obligatorio")
        @Positive(message = "El id del vehículo no es válido")
        Long vehiculoId,

        @NotBlank(message = "La descripción es obligatoria")
        @Size(max = 255, message = "La descripción no puede superar 255 caracteres")
        String descripcion,

        // Acuerdo 11: el costo no puede ser negativo
        @NotNull(message = "El costo es obligatorio")
        @PositiveOrZero(message = "El costo no puede ser negativo")
        @Digits(integer = 13, fraction = 2, message = "El costo admite hasta 13 enteros y 2 decimales")
        BigDecimal costo,

        // Opcional: si no se envía, se usa la fecha de hoy
        LocalDate fecha
) {
}
