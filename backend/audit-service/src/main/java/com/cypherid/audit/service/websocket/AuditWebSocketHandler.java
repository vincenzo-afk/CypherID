package com.cypherid.audit.service.websocket;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * AuditWebSocketHandler — realtime audit event stream for the dashboard
 * (WS /ws/audit, docs/api/07_AUDIT_APIS.md).
 */
@Component
public class AuditWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(AuditWebSocketHandler.class);

    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        logger.debug("Audit WS connected: {} ({} total)", session.getId(), sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        logger.debug("Audit WS closed: {} ({} total)", session.getId(), sessions.size());
    }

    /**
     * Broadcasts a JSON event payload to all connected dashboard clients.
     * Best-effort: drops dead sessions, never throws.
     */
    public void broadcast(String jsonPayload) {
        TextMessage message = new TextMessage(jsonPayload);
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) {
                    session.sendMessage(message);
                } else {
                    sessions.remove(session);
                }
            } catch (Exception e) {
                logger.debug("WS send failed, dropping session: {}", e.getMessage());
                sessions.remove(session);
            }
        }
    }
}
