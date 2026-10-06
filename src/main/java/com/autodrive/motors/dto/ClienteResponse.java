package com.autodrive.motors.dto;

import com.autodrive.motors.model.Cliente;

public record ClienteResponse(
        Long id,
        String nombre,
        String documento,
        String correo,
        String telefono
) {
    public static ClienteResponse from(Cliente c) {
        return new ClienteResponse(c.getId(), c.getNombre(), c.getDocumento(),
                c.getCorreo(), c.getTelefono());
    }
}
