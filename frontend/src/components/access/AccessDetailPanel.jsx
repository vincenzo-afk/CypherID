import {
  Box, Button, Drawer, Divider, IconButton, Typography
} from '@mui/material';
import { Mono, SectionLabel, VAULT_COLORS as C } from '../files/FileVisuals.jsx';

const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const Field = ({ label, children }) => (
  <Box sx={{ mb: 1.8 }}>
    <SectionLabel sx={{ display: 'block', mb: 0.4 }}>{label}</SectionLabel>
    <Typography component="div" sx={{ color: C.text, fontSize: '0.85rem' }}>{children}</Typography>
  </Box>
);

/**
 * AccessDetailPanel — everything known about one real grant, plus the
 * actions that actually exist on the backend (Revoke; Extend via re-grant).
 * Backend audit events for individual delegations are not exposed by an API,
 * so the panel says so instead of inventing history.
 */
export default function AccessDetailPanel({ open, onClose, grant, direction, onRevoke, onExtend }) {
  if (!grant) return null;
  const active = grant.active && new Date(grant.expiresAt) > new Date();
  const isOutgoing = direction !== 'incoming';

  return (
    <Drawer
      anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, bgcolor: C.bg, borderLeft: `1px solid ${C.line}`, backgroundImage: 'none' } }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <SectionLabel>ACCESS DETAILS</SectionLabel>
          <IconButton onClick={onClose} aria-label="Close access details" sx={{ color: C.dim, p: 0.5 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </IconButton>
        </Box>

        <Field label={isOutgoing ? 'RECIPIENT' : 'GRANTED BY'}>
          <Mono>{isOutgoing ? grant.toDID : grant.fromDID}</Mono>
        </Field>
        <Field label="RESOURCE">
          <Mono>{grant.resourceId}</Mono>
        </Field>
        <Field label="PERMISSION">
          {grant.action === 'WRITE' ? 'READ + WRITE' : 'READ'}
        </Field>
        <Field label="STATUS">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: active ? C.green : C.dim }} />
            <Typography sx={{ fontFamily: C.mono, fontSize: '0.72rem', letterSpacing: '0.12em', color: active ? C.green : C.dim }}>
              {active ? 'ACTIVE' : grant.active ? 'EXPIRED' : 'REVOKED'}
            </Typography>
          </Box>
        </Field>
        <Field label={isOutgoing ? 'GRANTED BY' : 'GRANTED TO ME'}>
          <Mono>{grant.fromDID}</Mono>
        </Field>
        <Field label="GRANTED">{fmt(grant.createdAt)}</Field>
        <Field label="EXPIRES">{fmt(grant.expiresAt)}</Field>

        <Divider sx={{ borderColor: C.line, my: 2.5 }} />

        <SectionLabel sx={{ display: 'block', mb: 1 }}>ACCESS HISTORY</SectionLabel>
        <Typography sx={{ color: C.dim, fontSize: '0.78rem', lineHeight: 1.7 }}>
          A complete per-grant audit history is unavailable — the access service records delegations
          on the ledger but does not yet expose per-grant event queries.
        </Typography>

        {active && isOutgoing && (
          <>
            <Divider sx={{ borderColor: C.line, my: 2.5 }} />
            <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
              <Button
                onClick={onRevoke}
                sx={{ color: C.red, border: '1px solid rgba(248,113,113,0.4)', letterSpacing: '0.06em', fontSize: '0.74rem' }}
              >
                REVOKE ACCESS
              </Button>
              <Button
                onClick={onExtend}
                sx={{ color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em', fontSize: '0.74rem' }}
              >
                EXTEND 7 DAYS
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
