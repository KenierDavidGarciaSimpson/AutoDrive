package com.autodrive.motors.dto;

import com.autodrive.motors.model.EstadoVehiculo;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * "estado" es opcional: al registrar se ignora (siempre queda DISPONIBLE) y al actualizar
 * permite devolver el vehículo a DISPONIBLE después de un mantenimiento (acuerdo 5).
 */
public record VehiculoRequest(
        @NotBlank(message = "La placa es obligatoria")
        @Size(max = 10, message = "La placa no puede superar 10 caracteres")
        String placa,

        @NotBlank(message = "La marca es obligatoria")
        @Size(max = 50, message = "La marca no puede superar 50 caracteres")
        String marca,

        @NotBlank(message = "El modelo es obligatorio")
        @Size(max = 50, message = "El modelo no puede superar 50 caracteres")
        String modelo,

        @NotNull(message = "El año es obligatorio")
        @Min(value = 1900, message = "El año debe ser 1900 o posterior")
        @Max(value = 2100, message = "El año no es válido")
        Integer anio,

        // RN02: no se permiten precios negativos (el precio debe ser mayor que cero)
        @NotNull(message = "El precio es obligatorio")
        @Positive(message = "El precio debe ser mayor que cero")
        @Digits(integer = 13, fraction = 2, message = "El precio admite hasta 13 enteros y 2 decimales")
        BigDecimal precio,

        EstadoVehiculo estado
) {
}
