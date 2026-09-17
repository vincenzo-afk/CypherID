import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, CircularProgress, Divider, Paper, Typography } from '@mui/material';
import { api } from '../services/api.js';

const listOf = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

// Notifications shown as simple messages, newest first, in plain words.
export default function NotificationsPage() {
  const { data, refetch, isLoading } = useQuery({
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h5">Alerts</Typography>
        {items.some((n) => !n.read) && (
          <Button size="small" variant="outlined" onClick={markAllRead}>Mark all as read</Button>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Everything that happened to your account: files you shared, access that was
        allowed or refused, and anything the system thought looked unusual.
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Box>
      )}

      {!isLoading && items.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Nothing to report yet. New activity will appear here.
          </Typography>
        </Paper>
      )}

      {items.map((n) => (
        <Paper key={n.id || n.notificationId} sx={{ p: 2, mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={n.read ? 'Read' : 'New'} color={n.read ? 'default' : 'primary'} />
            <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 600, flex: 1, minWidth: 200 }}>
              {n.message || n.title || 'Activity on your account'}
            </Typography>
            {!n.read && (
              <Button size="small" variant="outlined" onClick={() => markRead(n.id || n.notificationId)}>
                Mark as read
              </Button>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {n.createdAt || n.timestamp || ''} {n.type || n.severity ? `· ${n.type || n.severity}` : ''}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
