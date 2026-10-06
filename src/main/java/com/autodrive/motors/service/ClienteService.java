package com.autodrive.motors.service;

import com.autodrive.motors.dto.ClienteRequest;
import com.autodrive.motors.dto.ClienteResponse;
import com.autodrive.motors.exception.RecursoNoEncontradoException;
import com.autodrive.motors.exception.ReglaNegocioException;
import com.autodrive.motors.model.Cliente;
import com.autodrive.motors.repository.ClienteRepository;
import com.autodrive.motors.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;

    public ClienteService(ClienteRepository clienteRepository, VentaRepository ventaRepository) {
        this.clienteRepository = clienteRepository;
        this.ventaRepository = ventaRepository;
    }

    @Transactional
    public ClienteResponse crear(ClienteRequest req) {
        String correo = normalizarCorreo(req.correo());

        // RN04: correos no repetidos
        if (clienteRepository.existsByCorreo(correo)) {
            throw new ReglaNegocioException("Ya existe un cliente registrado con el correo " + correo);
        }

        Cliente cliente = new Cliente();
        copiarDatos(cliente, req, correo);
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional(readOnly = true)
    public List<ClienteResponse> listar() {
        return clienteRepository.findAll().stream().map(ClienteResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ClienteResponse buscarPorId(Long id) {
        return ClienteResponse.from(obtener(id));
    }

    @Transactional
    public ClienteResponse actualizar(Long id, ClienteRequest req) {
        Cliente cliente = obtener(id);
        String correo = normalizarCorreo(req.correo());

        if (clienteRepository.existsByCorreoAndIdNot(correo, id)) {
            throw new ReglaNegocioException("Ya existe otro cliente registrado con el correo " + correo);
        }

        copiarDatos(cliente, req, correo);
        return ClienteResponse.from(clienteRepository.save(cliente));
    }

    @Transactional
    public void eliminar(Long id) {
        Cliente cliente = obtener(id);

        // Acuerdo 7: no se elimina un cliente con ventas (409)
        if (ventaRepository.existsByClienteId(id)) {
            throw new ReglaNegocioException("No se puede eliminar el cliente porque tiene ventas asociadas");
        }

        clienteRepository.delete(cliente);
    }

    private Cliente obtener(Long id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> RecursoNoEncontradoException.de("Cliente", id));
    }

    private String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase();
    }

    private void copiarDatos(Cliente cliente, ClienteRequest req, String correo) {
        cliente.setNombre(req.nombre().trim());
        cliente.setDocumento(req.documento().trim());
        cliente.setCorreo(correo);
        cliente.setTelefono(req.telefono());
    }
}
