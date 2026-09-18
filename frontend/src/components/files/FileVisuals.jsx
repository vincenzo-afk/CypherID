import { Box, Chip, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const C = {
  bg: '#05070D',
  panel: '#0A0F1A',
  line: 'rgba(120,150,200,0.14)',
  cyan: '#38A6FF',
  cyanSoft: 'rgba(56,166,255,0.14)',
  violet: '#8B7CF6',
  text: '#E8EEFB',
  dim: '#8CA0C4',
  green: '#4ADE80',
  amber: '#FBBF24',
  red: '#F87171',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace'
};

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

/** Returns a small inline SVG icon per file type. Plain <svg> elements (MUI Box
 *  swallows width/height as system props — machine quirk noted in run.md). */
const TYPE_STYLES = {
  pdf: { label: 'PDF', color: '#F87171' },
  document: { label: 'DOC', color: '#60A5FA' },
  spreadsheet: { label: 'XLS', color: '#4ADE80' },
  image: { label: 'IMG', color: '#C084FC' },
  video: { label: 'VID', color: '#F472B6' },
  archive: { label: 'ZIP', color: '#FBBF24' },
  code: { label: 'CODE', color: '#38A6FF' },
  text: { label: 'TXT', color: '#8CA0C4' },
  file: { label: 'FILE', color: '#8CA0C4' }
};

export function fileKind(fileName = '', fileType = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const t = (fileType || '').toLowerCase();
  if (ext === 'pdf' || t.includes('pdf')) return 'pdf';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'spreadsheet';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext) || t.startsWith('image/')) return 'image';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || t.startsWith('video/')) return 'video';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || t.includes('zip')) return 'archive';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'sh', 'json', 'yml', 'yaml'].includes(ext)) return 'code';
  if (['txt', 'md'].includes(ext) || t.startsWith('text/')) return 'text';
  return 'file';
}

export function FileTypeIcon({ fileName, fileType, size = 34 }) {
  const kind = fileKind(fileName, fileType);
  const s = TYPE_STYLES[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path d="M8 3h13l6 6v22H8V3z" stroke={s.color} strokeWidth="1.4" opacity="0.9" />
      <path d="M21 3v6h6" stroke={s.color} strokeWidth="1.4" opacity="0.9" />
      <rect x="4" y="18" width="26" height="11" rx="1.5" fill={C.bg} stroke={s.color} strokeWidth="1.2" />
      <text x="17" y="26" textAnchor="middle" fontSize="6.4" fontFamily={C.mono} fill={s.color} fontWeight="700" letterSpacing="0.5">
        {s.label}
      </text>
    </svg>
  );
}

/** Classification badge — real classification values from the ledger. */
export function ClassificationBadge({ classification }) {
  const map = {
    TOP_SECRET: { label: 'TOP SECRET', color: C.red },
    SECRET: { label: 'SECRET', color: C.amber },
    CONFIDENTIAL: { label: 'CONFIDENTIAL', color: C.violet },
    UNCLASSIFIED: { label: 'UNCLASSIFIED', color: C.dim }
  };
  const m = map[classification] || { label: (classification || 'UNKNOWN').toUpperCase(), color: C.dim };
  return (
    <Typography component="span" sx={{
      fontFamily: C.mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
      color: m.color, border: `1px solid ${m.color}44`, px: 0.9, py: '2px', borderRadius: '2px'
    }}>
      {m.label}
    </Typography>
  );
}

export function ActiveStatusChip({ status }) {
  const label = { ACTIVE: 'ACTIVE', TRANSFERRED: 'TRANSFERRED', BURNED: 'DESTROYED', SUSPENDED: 'SUSPENDED' }[status] || (status || '').toUpperCase();
  const color = status === 'ACTIVE' ? C.green : status === 'SUSPENDED' ? C.amber : C.dim;
  return (
    <Typography component="span" sx={{
      fontFamily: C.mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
      color, border: `1px solid ${color}44`, px: 0.9, py: '2px', borderRadius: '2px'
    }}>
      {label}
    </Typography>
  );
}

/** AES badge — only rendered where the backend genuinely encrypts (AES-256-GCM). */
export function EncryptedBadge() {
  return (
    <Typography component="span" sx={{
      fontFamily: C.mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
      color: C.green, border: `1px solid ${C.green}44`, px: 0.9, py: '2px', borderRadius: '2px',
      display: 'inline-flex', alignItems: 'center', gap: 0.6
    }}>
      <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: C.green, animation: `${pulse} 2.4s ease-in-out infinite` }} />
      ENCRYPTED
    </Typography>
  );
}

export function Kicker({ children }) {
  return (
    <Typography sx={{
      fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.32em',
      color: C.cyan, textTransform: 'uppercase', mb: 1
    }}>
      {children}
    </Typography>
  );
}

export function SectionLabel({ children, sx = {} }) {
  return (
    <Typography sx={{
      fontFamily: C.mono, fontSize: '0.64rem', letterSpacing: '0.24em',
      color: C.dim, textTransform: 'uppercase', ...sx
    }}>
      {children}
    </Typography>
  );
}

export function Mono({ children, sx = {} }) {
  return (
    <Typography component="span" sx={{ fontFamily: C.mono, fontSize: '0.78rem', color: C.text, wordBreak: 'break-all', ...sx }}>
      {children}
    </Typography>
  );
}

export const VAULT_COLORS = C;

export function StatusDot({ color = C.green, size = 6 }) {
  return <Box component="span" sx={{ width: size, height: size, borderRadius: '50%', bgcolor: color, display: 'inline-block', flexShrink: 0 }} />;
}

export function VaultChip({ children, color = C.cyan }) {
  return (
    <Chip
      size="small"
      label={children}
      sx={{
        fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.14em', fontWeight: 700,
        color, border: `1px solid ${color}44`, bgcolor: 'transparent', borderRadius: '2px', height: 24
      }}
    />
  );
}
