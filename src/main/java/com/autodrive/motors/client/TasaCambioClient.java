package com.autodrive.motors.client;

import com.autodrive.motors.exception.ServicioExternoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Consulta la tasa de cambio COP por USD en una API pública
 * y la guarda en memoria unos minutos para no repetir consultas.
 */
@Component
public class TasaCambioClient {

    private final RestClient restClient;
    private final String url;
    private final Duration duracionCache;

    private BigDecimal tasaEnCache;   // COP por 1 USD
    private Instant momentoCache;

    public TasaCambioClient(RestClient restClient,
                            @Value("${app.tasa-cambio.url}") String url,
                            @Value("${app.tasa-cambio.cache-minutos}") long cacheMinutos) {
        this.restClient = restClient;
        this.url = url;
        this.duracionCache = Duration.ofMinutes(cacheMinutos);
    }

    /** Devuelve cuántos pesos vale 1 dólar. Lanza ServicioExternoException si no se puede obtener. */
    public synchronized BigDecimal obtenerTasa() {
        if (tasaEnCache != null && momentoCache != null
                && Duration.between(momentoCache, Instant.now()).compareTo(duracionCache) < 0) {
            return tasaEnCache;
        }

        try {
            Map<String, Object> respuesta = restClient.get()
                    .uri(url)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            BigDecimal tasa = extraerTasaCop(respuesta);

            tasaEnCache = tasa;
            momentoCache = Instant.now();
            return tasa;
        } catch (RestClientException e) {
            throw new ServicioExternoException(
                    "No se pudo consultar la tasa de cambio. Intente de nuevo más tarde.", e);
        }
    }

    /** USD = valor en COP / tasa, redondeado a 2 decimales. */
    public BigDecimal convertirAUsd(BigDecimal valorCop, BigDecimal tasa) {
        return valorCop.divide(tasa, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal extraerTasaCop(Map<String, Object> respuesta) {
        if (respuesta == null || !(respuesta.get("rates") instanceof Map<?, ?> rates)) {
            throw new ServicioExternoException("La API de tasa de cambio devolvió una respuesta inválida.");
        }

        Object cop = rates.get("COP");
        if (!(cop instanceof Number numero)) {
            throw new ServicioExternoException("La API de tasa de cambio no incluyó la tasa del peso colombiano.");
        }

        BigDecimal tasa = new BigDecimal(numero.toString());
        if (tasa.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ServicioExternoException("La API de tasa de cambio devolvió una tasa inválida.");
        }
        return tasa;
    }
}
