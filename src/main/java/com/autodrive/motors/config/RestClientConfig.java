package com.autodrive.motors.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient(
            @Value("${app.tasa-cambio.timeout-conexion-ms}") int conexionMs,
            @Value("${app.tasa-cambio.timeout-lectura-ms}") int lecturaMs) {

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(conexionMs);
        factory.setReadTimeout(lecturaMs);

        return RestClient.builder().requestFactory(factory).build();
    }
}
