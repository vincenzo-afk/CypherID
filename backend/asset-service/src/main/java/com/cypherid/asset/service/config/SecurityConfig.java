package com.cypherid.asset.service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * SecurityConfig — Spring Security 6 configuration for the Asset Service.
 * <p>
 * This service sits behind the API Gateway which validates JWTs and injects
 * trusted X-User-DID / X-User-Roles headers. Direct access (without gateway)
 * is blocked in production by network policy.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // API paths are permitted: the API Gateway validates JWTs and
                        // injects trusted X-User-DID / X-User-Roles headers. Direct
                        // access without the gateway is blocked by network policy.
                        .requestMatchers("/api/v1/**").permitAll()
                        // Internal service-to-service endpoint (ai-svc → asset-service)
                        .requestMatchers("/api/security/**").permitAll()
                        // Health checks — always public
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().denyAll()
                )
                .build();
    }
}