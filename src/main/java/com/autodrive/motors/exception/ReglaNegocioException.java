package com.autodrive.motors.exception;

/** Se lanza cuando se viola una regla de negocio. Se responde con 409 Conflict. */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }
}
