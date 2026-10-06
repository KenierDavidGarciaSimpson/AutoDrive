package com.autodrive.motors.dto;

import java.time.LocalDateTime;

/** Formato de error acordado por el grupo (acuerdo 16). */
public record ErrorResponse(
        LocalDateTime fecha,
        int estado,
        String mensaje
) {
}
