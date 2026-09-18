import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, IconButton, MenuItem, Skeleton, TextField, Tooltip, Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Kicker, SectionLabel, FileTypeIcon, ClassificationBadge, EncryptedBadge, VAULT_COLORS as C } from '../components/files/FileVisuals.jsx';
import UploadVault from '../components/files/UploadVault.jsx';
import FileDetails from '../components/files/FileDetails.jsx';
import ShareModal from '../components/files/ShareModal.jsx';
import DeleteModal from '../components/files/DeleteModal.jsx';

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const fmtSize = (b) => {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};
const fmtWhen = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const day = 24 * 3600 * 1000;
  if (diff < 3600 * 1000) return `${Math.max(1, Math.round(diff / 60000))} min ago`;
  if (diff < day) return `Today, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 2 * day) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const listOf = (data) => (Array.isArray(data) ? data : (Array.isArray(data?.assets) ? data.assets : []));
const isFabricDown = (e) => e?.response?.status === 503 || e?.response?.data?.code === 'FABRIC_UNAVAILABLE';

const FILTERS = ['ALL', 'PRIVATE', 'SHARED', 'RECENT'];
const SORTS = { modified: 'DATE MODIFIED', name: 'NAME', size: 'SIZE' };

export default function AssetHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('modified');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const ownerDID = user?.did || '';
  const isAdmin = (user?.roles || '').includes('ADMIN');

  const assetsQuery = useQuery({
    queryKey: ['assets', ownerDID],
    queryFn: () => api.listAssets(ownerDID),
    enabled: Boolean(ownerDID),
    retry: false
  });
  const assets = useMemo(() => listOf(assetsQuery.data), [assetsQuery.data]);

  const delegationsQuery = useQuery({
    queryKey: ['delegations-outgoing'],
    queryFn: () => api.listDelegations('outgoing').catch(() => []),
    retry: false
  });
  const delegationRows = listOf(delegationsQuery.data);
  const sharedIds = new Set(delegationRows.filter((d) => d.active).map((d) => d.resourceId));

  const stats = useMemo(() => {
    const totalBytes = assets.reduce((s, a) => s + (a.fileSizeBytes || 0), 0);
    const shared = assets.filter((a) => sharedIds.has(a.assetId || a.id)).length;
    const recent = assets.filter((a) => {
      const t = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return Date.now() - t < 7 * 24 * 3600 * 1000;
    }).length;
    return {
      total: assets.length,
      totalBytes,
      shared,
      privateCount: Math.max(0, assets.length - shared),
      recent
    };
  }, [assets, delegationsQuery.data]);

  const visible = useMemo(() => {
    let list = [...assets];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((a) =>
      (a.fileName || '').toLowerCase().includes(q)
      || (a.fileType || '').toLowerCase().includes(q)
      || (a.classification || '').toLowerCase().includes(q)
      || (a.assetId || a.id || '').toLowerCase().includes(q));
    if (filter === 'PRIVATE') list = list.filter((a) => !sharedIds.has(a.assetId || a.id));
    if (filter === 'SHARED') list = list.filter((a) => sharedIds.has(a.assetId || a.id));
    if (filter === 'RECENT') {
      list = list.filter((a) => Date.now() - new Date(a.updatedAt || a.createdAt || 0).getTime() < 7 * 24 * 3600 * 1000);
    }
    list.sort((a, b) => {
      if (sort === 'name') return (a.fileName || '').localeCompare(b.fileName || '');
      if (sort === 'size') return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
    return list;
  }, [assets, search, filter, sort, delegationsQuery.data]);

  const historyQuery = useQuery({
    queryKey: ['asset-history', selected?.assetId || selected?.id],
    queryFn: () => api.assetHistory(selected.assetId || selected.id),
    enabled: Boolean(selected),
    retry: false
  });
  const history = listOf(historyQuery.data?.history || historyQuery.data?.events || historyQuery.data);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('classification', 'CONFIDENTIAL');
    const res = await api.uploadAsset(fd);
    assetsQuery.refetch();
    return res;
  };

  const grant = async (body) => {
    const res = await api.delegateAccess(body);
    delegationsQuery.refetch();
    setNotice({ sev: 'ok', text: `ACCESS GRANTED ✓ — ${body.toDID} · ${body.action === 'READ' ? 'READ' : 'READ + WRITE'}` });
    return res;
  };

  const revoke = async (p) => {
    try {
      await api.revokeDelegate({ toDID: p.toDID, resourceId: p.resourceId });
      delegationsQuery.refetch();
      setNotice({ sev: 'ok', text: `ACCESS REVOKED — ${p.subjectId || p.toDID} no longer holds this file.` });
    } catch (e) {
      setNotice({ sev: 'err', text: e?.response?.data?.message || 'Revocation failed.' });
    }
  };

  const openFile = async (asset) => {
    const assetId = asset.assetId || asset.id;
    try {
      const session = await api.issueProtectedSession(assetId);
      if (session.sessionId) {
        navigate(`/protected/document/${session.sessionId}`, { state: { sessionToken: session.sessionToken } });
      } else {
        setNotice({ sev: 'err', text: 'The backend returned no viewing session — access may be denied.' });
      }
    } catch (e) {
      setNotice({ sev: 'err', text: e?.response?.data?.message || 'Protected session failed — access may be denied for this file.' });
    }
  };

  const doDelete = async ({ ownerSignature }) => {
    const assetId = selected.assetId || selected.id;
    await api.burnAsset(assetId, { ownerSignature });
    setSelected(null);
    setDeleteOpen(false);
    assetsQuery.refetch();
    setNotice({ sev: 'ok', text: 'FILE DESTROYED — the encrypted content and its record are gone.' });
  };

  const fabricDown = isFabricDown(assetsQuery.error);

  /* ─────────────────────────── render ─────────────────────────── */

  return (
    <Box sx={{ color: C.text, maxWidth: 1180, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>

      {/* ── header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Kicker>FILES</Kicker>
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
            Your encrypted files, under your control.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => document.getElementById('vault-upload')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' })}
          sx={{ bgcolor: C.cyan, color: '#04121F', fontWeight: 700, letterSpacing: '0.06em', '&:hover': { bgcolor: '#5CB8FF' } }}
        >
          + UPLOAD FILE
        </Button>
      </Box>

      {/* ── stats ── */}
      <Box sx={{ display: 'flex', gap: { xs: 2.5, md: 5 }, mt: 3, flexWrap: 'wrap' }}>
        {[
          ['TOTAL FILES', assetsQuery.isLoading ? null : stats.total],
          ['PRIVATE', assetsQuery.isLoading ? null : stats.privateCount],
          ['SHARED', assetsQuery.isLoading ? null : stats.shared],
          ['RECENTLY UPDATED', assetsQuery.isLoading ? null : stats.recent]
        ].map(([label, v]) => (
          <Box key={label}>
            <SectionLabel>{label}</SectionLabel>
            {v == null
              ? <Skeleton width={40} sx={{ bgcolor: 'rgba(56,166,255,0.12)' }} />
              : (
                <Typography sx={{ fontFamily: C.mono, fontSize: '1.5rem', fontWeight: 700, color: C.text }}>
                  {v}
                </Typography>
              )}
          </Box>
        ))}
      </Box>

      {/* ── vault banner ── */}
      <Box sx={{
        mt: 4, border: `1px solid ${C.line}`, borderRadius: '4px', p: { xs: 2, md: 2.5 },
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2,
        bgcolor: C.panel, position: 'relative', overflow: 'hidden'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontWeight: 700, letterSpacing: '0.14em', fontSize: '0.85rem' }}>SECURE FILE VAULT</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: C.green }} />
              <Typography sx={{ color: C.green, fontFamily: C.mono, fontSize: '0.68rem', letterSpacing: '0.14em' }}>
                ENCRYPTION ACTIVE
              </Typography>
            </Box>
          </Box>
          <Typography sx={{ color: C.dim, fontSize: '0.78rem', maxWidth: 380 }}>
            Files are encrypted server-side with a per-file AES-256-GCM key before storage, and their records are anchored on the ledger.
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <SectionLabel sx={{ display: 'block', mb: 0.4 }}>STORED</SectionLabel>
          <Typography sx={{ fontFamily: C.mono, fontSize: '0.95rem', color: C.text }}>
            {fmtSize(stats.totalBytes)} <Typography component="span" sx={{ color: C.dim, fontSize: '0.72rem' }}>· {stats.total} file{stats.total === 1 ? '' : 's'}</Typography>
          </Typography>
        </Box>
      </Box>

      {/* ── upload ── */}
      <Box id="vault-upload" sx={{ mt: 3 }}>
        <UploadVault onUpload={uploadFile} reducedMotion={REDUCED} />
      </Box>

      {/* ── notice ── */}
      {notice && (
        <Typography role="status" sx={{
          mt: 2, fontFamily: C.mono, fontSize: '0.74rem', letterSpacing: '0.06em',
          color: notice.sev === 'ok' ? C.green : C.red
        }}>
          {notice.text}
        </Typography>
      )}

      {/* ── search / filters / sort / view ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mt: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search files…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 220, '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(5,7,13,0.6)', fontFamily: C.mono, fontSize: '0.8rem',
              '& fieldset': { borderColor: C.line }, '&:hover fieldset': { borderColor: `${C.cyan}66` }
            }
          }}
        />
        {FILTERS.map((f) => (
          <Button key={f} onClick={() => setFilter(f)}
            sx={{
              minWidth: 0, px: 1.6, py: 0.5, fontFamily: C.mono, fontSize: '0.66rem', letterSpacing: '0.14em',
              color: filter === f ? '#04121F' : C.dim, bgcolor: filter === f ? C.cyan : 'transparent',
              border: `1px solid ${filter === f ? C.cyan : C.line}`, borderRadius: '2px',
              '&:hover': { bgcolor: filter === f ? '#5CB8FF' : 'rgba(56,166,255,0.06)' }
            }}>
            {f}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <TextField
          select size="small" value={sort} onChange={(e) => setSort(e.target.value)}
          sx={{
            minWidth: 150, '& .MuiOutlinedInput-root': { fontFamily: C.mono, fontSize: '0.72rem', '& fieldset': { borderColor: C.line } }
          }}
        >
          {Object.entries(SORTS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <Tooltip title={view === 'list' ? 'Grid view' : 'List view'}>
          <IconButton onClick={() => setView(view === 'list' ? 'grid' : 'list')}
            aria-label={view === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            sx={{ border: `1px solid ${C.line}`, borderRadius: '2px', color: C.dim }}>
            {view === 'list' ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" stroke="currentColor" /><rect x="8" y="1" width="5" height="5" stroke="currentColor" /><rect x="1" y="8" width="5" height="5" stroke="currentColor" /><rect x="8" y="8" width="5" height="5" stroke="currentColor" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" /></svg>
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── error state ── */}
      {fabricDown && (
        <Box sx={{ mt: 3, border: '1px solid rgba(251,191,36,0.4)', borderRadius: '4px', p: 2.5, bgcolor: 'rgba(251,191,36,0.05)' }}>
          <Typography sx={{ color: C.amber, fontFamily: C.mono, fontSize: '0.76rem', letterSpacing: '0.08em' }}>
            LEDGER UNREACHABLE
          </Typography>
          <Typography sx={{ color: C.dim, fontSize: '0.8rem', mt: 0.8 }}>
            Unable to load file information — the secure record network is not answering right now.
          </Typography>
          <Button onClick={() => assetsQuery.refetch()} sx={{ mt: 1.5, color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            RETRY
          </Button>
        </Box>
      )}
      {!fabricDown && assetsQuery.isError && (
        <Box sx={{ mt: 3, border: `1px solid ${C.line}`, borderRadius: '4px', p: 2.5 }}>
          <Typography sx={{ color: C.dim, fontSize: '0.8rem' }}>Unable to load file information.</Typography>
          <Button onClick={() => assetsQuery.refetch()} sx={{ mt: 1.5, color: C.cyan, border: `1px solid ${C.cyan}55`, letterSpacing: '0.06em' }}>
            RETRY
          </Button>
        </Box>
      )}

      {/* ── skeletons ── */}
      {assetsQuery.isLoading && !fabricDown && (
        <Box sx={{ mt: 3 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={54} sx={{ bgcolor: 'rgba(56,166,255,0.08)', mb: 1 }} />)}
        </Box>
      )}

      {/* ── empty vault ── */}
      {!assetsQuery.isLoading && !fabricDown && assets.length === 0 && (
        <Box sx={{ mt: 5, textAlign: 'center', border: `1px dashed ${C.line}`, borderRadius: '4px', py: 8 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ marginBottom: 16 }}>
            <path d="M14 20l18-10 18 10v24L32 54 14 44V20z" stroke={C.cyan} strokeWidth="1.4" opacity="0.7" />
            <path d="M14 20l18 10 18-10M32 30v24" stroke={C.cyan} strokeWidth="1.2" opacity="0.5" />
          </svg>
          <Typography sx={{ fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.9rem' }}>SECURE VAULT</Typography>
          <Typography sx={{ color: C.dim, mt: 1 }}>Your vault is empty.</Typography>
          <Typography sx={{ color: C.dim, fontSize: '0.8rem', mt: 0.5 }}>
            Upload your first file and start controlling your digital data.
          </Typography>
        </Box>
      )}

      {/* ── no search results ── */}
      {!assetsQuery.isLoading && assets.length > 0 && visible.length === 0 && (
        <Box sx={{ mt: 4, textAlign: 'center', py: 5 }}>
          <Typography sx={{ color: C.dim }}>No files found.</Typography>
          <Button onClick={() => { setSearch(''); setFilter('ALL'); }} sx={{ mt: 1, color: C.cyan, letterSpacing: '0.06em' }}>
            CLEAR SEARCH
          </Button>
        </Box>
      )}

      {/* ── list view ── */}
      {!assetsQuery.isLoading && visible.length > 0 && view === 'list' && (
        <Box sx={{ mt: 3, border: `1px solid ${C.line}`, borderRadius: '4px', overflow: 'hidden' }}>
          {visible.map((a, i) => {
            const id = a.assetId || a.id;
            const shared = sharedIds.has(id);
            return (
              <Box
                key={id}
                onClick={() => setSelected(a)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(a); }}
                aria-label={`Open details for ${a.fileName || id}`}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2, px: { xs: 1.5, md: 2.5 }, py: 1.6,
                  cursor: 'pointer', outline: 'none',
                  bgcolor: i % 2 ? 'rgba(10,15,26,0.5)' : 'transparent',
                  borderBottom: i < visible.length - 1 ? `1px solid ${C.line}` : 'none',
                  '&:hover, &:focus-visible': { bgcolor: 'rgba(56,166,255,0.06)' }
                }}
              >
                <FileTypeIcon fileName={a.fileName} fileType={a.fileType} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-all' }}>
                    {a.fileName || id}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                    <EncryptedBadge />
                    <ClassificationBadge classification={a.classification} />
                    {shared && (
                      <Typography component="span" sx={{ fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em', color: C.violet, border: `1px solid ${C.violet}44`, px: 0.9, py: '2px', borderRadius: '2px' }}>
                        SHARED
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'block' }, width: 90, textAlign: 'right' }}>
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', color: C.dim }}>{fmtSize(a.fileSizeBytes)}</Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'block' }, width: 120, textAlign: 'right' }}>
                  <Typography sx={{ fontFamily: C.mono, fontSize: '0.74rem', color: C.dim }}>
                    {fmtWhen(a.updatedAt || a.createdAt)}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={`Actions for ${a.fileName || id}`}
                  onClick={(e) => { e.stopPropagation(); setSelected(a); }}
                  sx={{ color: C.dim, '&:hover': { color: C.cyan } }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="2" cy="7" r="1.3" fill="currentColor" /><circle cx="7" cy="7" r="1.3" fill="currentColor" /><circle cx="12" cy="7" r="1.3" fill="currentColor" /></svg>
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── grid view ── */}
      {!assetsQuery.isLoading && visible.length > 0 && view === 'grid' && (
        <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {visible.map((a) => {
            const id = a.assetId || a.id;
            return (
              <Box
                key={id}
                onClick={() => setSelected(a)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(a); }}
                sx={{
                  border: `1px solid ${C.line}`, borderRadius: '4px', p: 2, cursor: 'pointer', outline: 'none',
                  bgcolor: C.panel, '&:hover, &:focus-visible': { borderColor: `${C.cyan}66`, bgcolor: 'rgba(56,166,255,0.05)' }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <FileTypeIcon fileName={a.fileName} fileType={a.fileType} size={38} />
                  <ClassificationBadge classification={a.classification} />
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mt: 1.5, wordBreak: 'break-all' }}>
                  {a.fileName || id}
                </Typography>
                <Typography sx={{ fontFamily: C.mono, fontSize: '0.68rem', color: C.dim, mt: 0.5 }}>
                  {fmtSize(a.fileSizeBytes)} · {fmtWhen(a.updatedAt || a.createdAt)}
                </Typography>
                <Box sx={{ mt: 1.2 }}><EncryptedBadge /></Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── admin: real access rules ── */}
      {isAdmin && !delegationsQuery.isLoading && delegationRows.length > 0 && (
        <Box sx={{ mt: 5 }}>
          <SectionLabel sx={{ display: 'block', mb: 1.5 }}>ACTIVE ACCESS RULES (ADMIN)</SectionLabel>
          {delegationRows.slice(0, 8).map((d, i) => (
            <Box key={i} sx={{
              display: 'flex', alignItems: 'center', gap: 2, py: 1.2, px: 2,
              border: `1px solid ${C.line}`, borderRadius: '3px', mb: 1, flexWrap: 'wrap'
            }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Mono>{d.resourceId}</Mono>
                <Typography sx={{ color: C.dim, fontSize: '0.7rem', mt: 0.3 }}>
                  → {d.toDID} · {d.action} {d.active ? '' : '· REVOKED'}
                </Typography>
              </Box>
              {d.active && (
                <Button size="small" onClick={() => revoke(d)} sx={{ color: C.red, border: '1px solid rgba(248,113,113,0.4)', fontFamily: C.mono, fontSize: '0.62rem', letterSpacing: '0.12em' }}>
                  REVOKE
                </Button>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* ── panels ── */}
      <FileDetails
        open={Boolean(selected)} onClose={() => setSelected(null)}
        asset={selected}
        ownerLabel={selected && (selected.ownerDID === ownerDID ? `${user?.name || 'You'} (you)` : selected.ownerDID)}
        history={history}
        historyLoading={historyQuery.isLoading}
        canWrite
        onOpen={() => openFile(selected)}
        onShare={() => setShareOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      <ShareModal
        open={shareOpen} onClose={() => setShareOpen(false)}
        asset={selected} onGrant={grant}
      />
      <DeleteModal
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        asset={selected} onDelete={doDelete}
      />
    </Box>
  );
}
