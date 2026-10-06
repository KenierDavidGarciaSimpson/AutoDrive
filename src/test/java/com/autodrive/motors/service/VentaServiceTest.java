package com.autodrive.motors.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Pruebas unitarias de la regla RN6 (descuento). No usan base de datos. */
class VentaServiceTest {

    // calcularDescuento no usa las dependencias, por eso pueden ser null
    private final VentaService servicio = new VentaService(null, null, null);

    @Test
    void sinDescuentoCuandoElPrecioEsMenorAlLimite() {
        BigDecimal descuento = servicio.calcularDescuento(new BigDecimal("80000000"));
        assertEquals(0, BigDecimal.ZERO.compareTo(descuento));
    }

    @Test
    void sinDescuentoCuandoElPrecioEsIgualAlLimite() {
        BigDecimal descuento = servicio.calcularDescuento(new BigDecimal("100000000"));
        assertEquals(0, BigDecimal.ZERO.compareTo(descuento));
    }

    @Test
    void conDescuentoCuandoElPrecioSuperaElLimite() {
        BigDecimal descuento = servicio.calcularDescuento(new BigDecimal("120000000"));
        assertEquals(0, new BigDecimal("6000000").compareTo(descuento));
    }
}
