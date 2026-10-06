package com.autodrive.motors.controller;

import com.autodrive.motors.dto.PrecioUsdResponse;
import com.autodrive.motors.dto.VehiculoRequest;
import com.autodrive.motors.dto.VehiculoResponse;
import com.autodrive.motors.service.VehiculoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/vehiculos")
public class VehiculoController {

    private final VehiculoService vehiculoService;

    public VehiculoController(VehiculoService vehiculoService) {
        this.vehiculoService = vehiculoService;
    }

    @GetMapping
    public List<VehiculoResponse> listar() {
        return vehiculoService.listar();
    }

    @GetMapping("/disponibles")
    public List<VehiculoResponse> disponibles() {
        return vehiculoService.listarDisponibles();
    }

    @GetMapping("/marca/{marca}")
    public List<VehiculoResponse> porMarca(@PathVariable("marca") String marca) {
        return vehiculoService.buscarPorMarca(marca);
    }

    @GetMapping("/{id}")
    public VehiculoResponse buscar(@PathVariable("id") Long id) {
        return vehiculoService.buscarPorId(id);
    }

    // Acuerdo 9
    @GetMapping("/{id}/precio-usd")
    public PrecioUsdResponse precioUsd(@PathVariable("id") Long id) {
        return vehiculoService.consultarPrecioUsd(id);
    }

    @PostMapping
    public ResponseEntity<VehiculoResponse> crear(@Valid @RequestBody VehiculoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(vehiculoService.crear(req));
    }

    @PutMapping("/{id}")
    public VehiculoResponse actualizar(@PathVariable("id") Long id, @Valid @RequestBody VehiculoRequest req) {
        return vehiculoService.actualizar(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable("id") Long id) {
        vehiculoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
