package com.cypherid.access.service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * SecurityConfig — Spring Security 6 configuration for the Access Service.
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
                        // Health checks — always public
                        .requestMatchers("/actuator/**").permitAll()
                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                .build();
    }
}