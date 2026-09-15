package com.cypherid.identity.service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import jakarta.servlet.DispatcherType;

/**
 * SecurityConfig — Spring Security 6 configuration for Identity Service.
 * <p>
 * This service is behind the API Gateway which handles JWT validation.
 * The service trusts X-User-DID headers injected by the gateway.
 * <p>
 * Direct access (without gateway) is blocked in production by network policy.
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
                        // The servlet container re-dispatches with DispatcherType.ERROR
                        // when a controller throws. Without this line that dispatch
                        // hits anyRequest().denyAll() below and every 500
                        // masquerades as an empty 403.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // API paths are permitted: the API Gateway validates JWTs and
                        // injects trusted X-User-DID / X-User-Roles headers. Direct
                        // access without the gateway is blocked by network policy.
                        .requestMatchers("/api/v1/**").permitAll()
                        // Health checks — always public
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().denyAll()
                )
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
