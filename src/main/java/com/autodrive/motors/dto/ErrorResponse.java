package com.autodrive.motors.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        LocalDateTime fecha,
        int estado,
        String mensaje,
        Map<String, String> errores
) {
    public ErrorResponse(LocalDateTime fecha, int estado, String mensaje) {
        this(fecha, estado, mensaje, null);
    }
}