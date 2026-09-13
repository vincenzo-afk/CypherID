package com.cypherid.audit.service.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/** Registers WS /ws/audit with configurable frontend origin restrictions. */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final AuditWebSocketHandler handler;

    @Value("${audit.ws.allowed-origins:${ALLOWED_ORIGINS:http://localhost:3000}}")
    private String allowedOrigins;

    public WebSocketConfig(AuditWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/audit").setAllowedOrigins(allowedOrigins.split(","));
    }
}
