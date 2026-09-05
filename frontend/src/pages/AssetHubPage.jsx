import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

export default function AssetHubPage() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.uploadAsset(fd);
      const assetId = res.assetId || res.id;
      const session = await api.issueProtectedSession(assetId);
      setMsg(`Minted ${assetId}. Session ${session.sessionId || ''} issued.`);
      if (session.sessionId) navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
    } catch { setMsg('Upload failed.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Asset Hub</Typography>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Button variant="contained" sx={{ ml: 2 }} onClick={upload}>Encrypt + Upload + Protect</Button>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
