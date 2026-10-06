package com.autodrive.motors.repository;

import com.autodrive.motors.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    // RN04: validar correo repetido al registrar
    boolean existsByCorreo(String correo);

    // RN04: validar correo repetido al actualizar (ignora al propio cliente)
    boolean existsByCorreoAndIdNot(String correo, Long id);
}
