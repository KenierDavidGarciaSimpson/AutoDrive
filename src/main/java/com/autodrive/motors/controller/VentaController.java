package com.autodrive.motors.controller;

import com.autodrive.motors.dto.VentaRequest;
import com.autodrive.motors.dto.VentaResponse;
import com.autodrive.motors.service.VentaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/ventas")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    @PostMapping
    public ResponseEntity<VentaResponse> registrar(@Valid @RequestBody VentaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ventaService.registrar(req));
    }

    @GetMapping
    public List<VentaResponse> listar() {
        return ventaService.listar();
    }
}
