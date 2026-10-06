package com.autodrive.motors.controller;

import com.autodrive.motors.client.TasaCambioClient;
import com.autodrive.motors.dto.TasaCambioResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Endpoint de apoyo para comprobar que la API externa responde (opcional). */
@RestController
@RequestMapping("/tasa-cambio")
public class TasaCambioController {

    private final TasaCambioClient tasaCambioClient;

    public TasaCambioController(TasaCambioClient tasaCambioClient) {
        this.tasaCambioClient = tasaCambioClient;
    }

    @GetMapping
    public TasaCambioResponse obtener() {
        BigDecimal copPorUsd = tasaCambioClient.obtenerTasa();
        BigDecimal usdPorCop = BigDecimal.ONE.divide(copPorUsd, 8, RoundingMode.HALF_UP);
        return new TasaCambioResponse("COP", "USD", copPorUsd, usdPorCop);
    }
}
