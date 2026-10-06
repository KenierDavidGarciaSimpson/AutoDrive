package com.autodrive.motors.controller;

import com.autodrive.motors.dto.MantenimientoRequest;
import com.autodrive.motors.dto.MantenimientoResponse;
import com.autodrive.motors.service.MantenimientoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/mantenimientos")
public class MantenimientoController {

    private final MantenimientoService mantenimientoService;

    public MantenimientoController(MantenimientoService mantenimientoService) {
        this.mantenimientoService = mantenimientoService;
    }

    @GetMapping
    public List<MantenimientoResponse> listar() {
        return mantenimientoService.listar();
    }

    @GetMapping("/vehiculo/{vehiculoId}")
    public List<MantenimientoResponse> historial(@PathVariable("vehiculoId") Long vehiculoId) {
        return mantenimientoService.historialPorVehiculo(vehiculoId);
    }

    @PostMapping
    public ResponseEntity<MantenimientoResponse> registrar(@Valid @RequestBody MantenimientoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mantenimientoService.registrar(req));
    }
}
