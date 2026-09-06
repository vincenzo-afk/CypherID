import { useQuery } from '@tanstack/react-query';
import { Box, Button, Typography } from '@mui/material';
import { api } from '../services/api.js';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

export default function NotificationsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications().catch(() => ({ notifications: [] }))
  });
  const items = listOf(data);

  const markRead = async (id) => {
    try { await api.markNotificationRead(id); refetch(); } catch { /* noop */ }
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read).map((n) => n.id || n.notificationId).filter(Boolean);
    for (const id of unread) {
      try { await api.markNotificationRead(id); } catch { /* per-item best effort */ }
    }
    refetch();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" gutterBottom>Notifications</Typography>
        {items.some((n) => !n.read) && (
          <Button size="small" variant="outlined" onClick={markAllRead}>Mark all as read</Button>
        )}
      </Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Security alerts, access decisions, and session events appear here.
      </Typography>
      {items.length === 0 && <Typography variant="body2">No notifications.</Typography>}
      {items.map((n) => (
        <Box key={n.id || n.notificationId} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 1 }}>
          <Typography variant="body2" fontWeight={n.read ? 'normal' : 'bold'}>
            [{n.type || n.severity || 'INFO'}] {n.message || n.title || JSON.stringify(n)}
          </Typography>
          <Typography variant="caption" color="text.secondary">{n.createdAt || n.timestamp || ''}</Typography>
          {!n.read && (
            <Box sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={() => markRead(n.id || n.notificationId)}>Mark read</Button>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
