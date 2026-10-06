package com.autodrive.motors.exception;

/** Falla de la API externa de tasa de cambio. Se responde con 503. */
public class ServicioExternoException extends RuntimeException {

    public ServicioExternoException(String mensaje) {
        super(mensaje);
    }

    public ServicioExternoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
