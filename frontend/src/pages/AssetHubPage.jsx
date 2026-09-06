import { useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

const CLASSIFICATIONS = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];

export default function AssetHubPage() {
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('classification', classification);
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
      <FormControl sx={{ ml: 2, minWidth: 180 }} size="small">
        <InputLabel id="classification-label">Classification</InputLabel>
        <Select
          labelId="classification-label"
          value={classification}
          label="Classification"
          onChange={(e) => setClassification(e.target.value)}
        >
          {CLASSIFICATIONS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>
      <Button variant="contained" sx={{ ml: 2 }} onClick={upload}>Encrypt + Upload + Protect</Button>
      {msg && <Typography sx={{ mt: 2 }}>{msg}</Typography>}
    </Box>
  );
}
