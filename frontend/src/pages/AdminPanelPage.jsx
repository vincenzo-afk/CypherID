import { Box, Typography } from '@mui/material';

export default function AdminPanelPage() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Admin Panel (ORG_ADMIN)</Typography>
      <Typography variant="body2">Policy management and watermark forensic lookup live here. Watermark lookup requires admin role and is audited.</Typography>
    </Box>
  );
}
