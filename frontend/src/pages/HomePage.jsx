import { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Home page — what CypherID is, in plain words, for a first-time visitor.
// No jargon, no raw data: one promise, three cards, four steps.
const CARDS = [
  {
    title: 'One identity',
    text: 'You get a single digital ID. It is how the system knows who you are — no shared passwords.'
  },
  {
    title: 'Files you control',
    text: 'Upload any kind of file. It is locked (encrypted) and only you decide who can open it.'
  },
  {
    title: 'Proof you can show',
    text: 'Every upload, share and view is written into a tamper-proof record you can point to later.'
  }
];

const STEPS = [
  'Create your digital ID — takes a minute.',
  'Add a file — it is locked and recorded as yours.',
  'Somebody needs it? They ask, you approve.',
  'Approve a file and it opens in a protected viewer that photos cannot copy clearly.'
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showHow, setShowHow] = useState(false);

  return (
    <Box>
      <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Your ID, your files, and proof of who did what
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
          CypherID keeps your identity and your important files in one place, locked
          to you only. When you share something, you choose who can see it — and the
          system keeps a record of it.
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Button variant="contained" size="large" onClick={() => navigate('/assets')}>Go to my files</Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/wallet')}>See my ID</Button>
            </>
          ) : (
            <>
              <Button variant="contained" size="large" component={Link} to="/register">Create my ID</Button>
              <Button variant="outlined" size="large" component={Link} to="/login">Log in</Button>
            </>
          )}
        </Box>
        <Button size="small" sx={{ mt: 2 }} onClick={() => setShowHow((v) => !v)}>
          {showHow ? 'Hide the steps' : 'How does it work?'}
        </Button>
        {showHow && (
          <Box component="ol" sx={{ mt: 2, pl: 3, textAlign: 'left', maxWidth: 560, mx: 'auto' }}>
            {STEPS.map((step) => (
              <Typography key={step} component="li" variant="body2" sx={{ mb: 1 }}>{step}</Typography>
            ))}
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gap: 2, mt: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}>
        {CARDS.map((card) => (
          <Paper key={card.title} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{card.title}</Typography>
            <Typography variant="body2" color="text.secondary">{card.text}</Typography>
          </Paper>
        ))}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        Files open in a protected viewer that deliberately blurs and shimmers when
        someone photographs the screen, so copies stay hard to use. It deters
        copying; it does not make it impossible.
      </Typography>
    </Box>
  );
}
