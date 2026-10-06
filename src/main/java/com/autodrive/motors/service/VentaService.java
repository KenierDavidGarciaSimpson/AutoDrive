package com.autodrive.motors.service;

import com.autodrive.motors.dto.VentaRequest;
import com.autodrive.motors.dto.VentaResponse;
import com.autodrive.motors.exception.RecursoNoEncontradoException;
import com.autodrive.motors.exception.ReglaNegocioException;
import com.autodrive.motors.model.Cliente;
import com.autodrive.motors.model.EstadoVehiculo;
import com.autodrive.motors.model.Vehiculo;
import com.autodrive.motors.model.Venta;
import com.autodrive.motors.repository.ClienteRepository;
import com.autodrive.motors.repository.VehiculoRepository;
import com.autodrive.motors.repository.VentaRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class VentaService {

    // RN6: descuento del 5 % si el precio SUPERA 100.000.000 COP
    private static final BigDecimal LIMITE_DESCUENTO = new BigDecimal("100000000");
    private static final BigDecimal PORCENTAJE_DESCUENTO = new BigDecimal("0.05");

    private final VentaRepository ventaRepository;
    private final ClienteRepository clienteRepository;
    private final VehiculoRepository vehiculoRepository;

    public VentaService(VentaRepository ventaRepository,
                        ClienteRepository clienteRepository,
                        VehiculoRepository vehiculoRepository) {
        this.ventaRepository = ventaRepository;
        this.clienteRepository = clienteRepository;
        this.vehiculoRepository = vehiculoRepository;
    }

    @Transactional
    public VentaResponse registrar(VentaRequest req) {
        Cliente cliente = clienteRepository.findById(req.clienteId())
                .orElseThrow(() -> RecursoNoEncontradoException.de("Cliente", req.clienteId()));

        // Bloqueo pesimista: nadie más puede vender este vehículo mientras dura la transacción
        Vehiculo vehiculo = vehiculoRepository.findByIdParaActualizar(req.vehiculoId())
                .orElseThrow(() -> RecursoNoEncontradoException.de("Vehículo", req.vehiculoId()));

        // RN1: no se vende un vehículo vendido o en mantenimiento (409, propuesta del grupo)
        if (vehiculo.getEstado() == EstadoVehiculo.VENDIDO) {
            throw new ReglaNegocioException("El vehículo ya fue vendido");
        }
        if (vehiculo.getEstado() == EstadoVehiculo.EN_MANTENIMIENTO) {
            throw new ReglaNegocioException("El vehículo está en mantenimiento y no puede venderse");
        }
        // Acuerdo 3: un vehículo se vende una sola vez
        if (ventaRepository.existsByVehiculoId(vehiculo.getId())) {
            throw new ReglaNegocioException("El vehículo ya tiene una venta registrada");
        }

        // RN5 y RN6: descuento y total
        BigDecimal precioBase = vehiculo.getPrecio();
        BigDecimal descuento = calcularDescuento(precioBase);
        BigDecimal total = precioBase.subtract(descuento);

        Venta venta = new Venta();
        venta.setCliente(cliente);
        venta.setVehiculo(vehiculo);
        venta.setPrecioBase(precioBase);
        venta.setDescuento(descuento);
        venta.setTotal(total);
        // La fecha la genera la entidad con @PrePersist

        // El vehículo pasa a VENDIDO
        vehiculo.setEstado(EstadoVehiculo.VENDIDO);

        return VentaResponse.from(ventaRepository.save(venta));
    }

    @Transactional(readOnly = true)
    public List<VentaResponse> listar() {
        return ventaRepository.findAll(Sort.by(Sort.Direction.DESC, "fecha"))
                .stream().map(VentaResponse::from).toList();
    }

    /** RN6: 5 % solo si el precio es mayor que 100.000.000 (si es igual, no hay descuento). */
    public BigDecimal calcularDescuento(BigDecimal precio) {
        if (precio.compareTo(LIMITE_DESCUENTO) > 0) {
            return precio.multiply(PORCENTAJE_DESCUENTO).setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(2);
    }
}
