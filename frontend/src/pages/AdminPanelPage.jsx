import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Paper, TextField, Typography
} from '@mui/material';
import { api } from '../services/api.js';

// Staff-friendly names for internal role codes.
const ROLE_OPTIONS = [
  'ORG_MEMBER', 'ORG_ADMIN', 'SYSTEM_AUDITOR',
  'CLEARANCE_LEVEL_1', 'CLEARANCE_LEVEL_2', 'CLEARANCE_LEVEL_3', 'CLEARANCE_LEVEL_4', 'TOP_SECRET'
];
const ROLE_LABELS = {
  ORG_MEMBER: 'Member — can use their own files',
  ORG_ADMIN: 'Organization admin — can create users and set rules',
  SYSTEM_AUDITOR: 'Auditor — can read the activity record',
  CLEARANCE_LEVEL_1: 'Clearance level 1',
  CLEARANCE_LEVEL_2: 'Clearance level 2',
  CLEARANCE_LEVEL_3: 'Clearance level 3',
  CLEARANCE_LEVEL_4: 'Clearance level 4',
  TOP_SECRET: 'Top secret'
};
const roleLabel = (r) => ROLE_LABELS[r] || r;

// One-click help for the "who may read what" rule builder.
const ACTION_OPTIONS = ['READ', 'WRITE', 'DOWNLOAD'];
const ACTION_LABELS = { READ: 'Read', WRITE: 'Change', DOWNLOAD: 'Download' };

const asList = (data) => (Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []);

// A section of the admin panel: title, plain-language explanation, and the
// underlying raw response tucked inside "Technical details" so the page stays
// readable for non-developers.
function AdminSection({ title, help, children, raw, rawLabel = 'Technical details' }) {
  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>}
      {children}
      {raw !== undefined && (
        <Accordion elevation={0} sx={{ mt: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
          <AccordionSummary>
            <Typography variant="body2">{rawLabel}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto' }}>{JSON.stringify(raw, null, 2)}</pre>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
}

export default function AdminPanelPage() {
  const [msg, setMsg] = useState('');
  const [policy, setPolicy] = useState({ resourceId: '', requiredRole: 'CLEARANCE_LEVEL_1', action: 'READ', abac: '' });
  const [displayId, setDisplayId] = useState('');
  const [forensic, setForensic] = useState(null);
  const [org, setOrg] = useState({ name: '', mspId: '' });
  const [role, setRole] = useState({ did: '', role: 'ORG_MEMBER', organization: '' });
  const [newUser, setNewUser] = useState({ name: '', employeeId: '', organization: '', department: '' });
  const [created, setCreated] = useState(null);
  const [vc, setVc] = useState({ subjectDID: '', credentialType: 'SecurityClearance', clearanceLevel: 'CLEARANCE_LEVEL_3', expirationDate: '' });
  const [didOp, setDidOp] = useState({ did: '', reason: '' });
  const [override, setOverride] = useState({ resourceId: '', reason: '' });

  const policies = useQuery({ queryKey: ['policies'], queryFn: () => api.listPolicies().catch(() => []) });
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.listOrganizations().catch(() => []) });
  const secEvents = useQuery({ queryKey: ['secEvents'], queryFn: () => api.securityEvents().catch(() => []) });
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.health().catch((e) => ({ error: 'unreachable' })) });
  const fabricHealth = useQuery({ queryKey: ['fabricHealth'], queryFn: () => api.fabricHealth().catch(() => ({ error: 'FABRIC_UNAVAILABLE' })) });

  const run = async (fn, ok) => {
    try { const r = await fn(); setMsg(ok + (r?.txHash ? ` Recorded as ${r.txHash}` : '')); policies.refetch(); orgs.refetch(); }
    catch (e) { setMsg(e?.response?.data?.message || 'That did not work. Check your permissions and try again.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Admin</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Everything an administrator can do: add people, decide who may open which
        files, and see the record of what has happened. Each section explains what it
        does in plain words.
      </Typography>
      {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <AdminSection
        title="Is everything working?"
        help="A quick check of the parts that must be running for files and identities to work."
      >
        {health.isLoading || fabricHealth.isLoading
          ? <Typography variant="body2">Checking…</Typography>
          : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={health.data?.error ? 'Services: not reachable' : 'Services: working'}
                color={health.data?.error ? 'error' : 'success'}
              />
              <Chip
                label={fabricHealth.data?.error ? 'Secure record: not reachable' : 'Secure record: working'}
                color={fabricHealth.data?.error ? 'error' : 'success'}
              />
              {(health.data?.fabric?.peers || []).map((p, i) => (
                <Chip key={i} variant="outlined" label={`${Object.keys(p)[0] || 'node'}: ${Object.values(p)[0]}`} />
              ))}
            </Box>
          )}
      </AdminSection>

      <AdminSection
        title="Who may open what"
        help="A rule says: this file needs this clearance for this action. For example — a top-secret file may only be read by someone with clearance level 3."
        raw={policies.data}
        rawLabel={`Technical details (${asList(policies.data).length} rules)`}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="File ID" placeholder="ASSET-…" value={policy.resourceId} onChange={(e) => setPolicy({ ...policy, resourceId: e.target.value })} />
          <TextField
            size="small"
            label="Needs this clearance"
            placeholder="CLEARANCE_LEVEL_1"
            helperText="Type CLEARANCE_LEVEL_1 … _4 or TOP_SECRET"
            value={policy.requiredRole}
            onChange={(e) => setPolicy({ ...policy, requiredRole: e.target.value })}
          />
          <TextField
            size="small"
            label="For this action"
            placeholder="READ"
            helperText={`One of ${ACTION_OPTIONS.map((a) => ACTION_LABELS[a]).join(', ')}`}
            value={policy.action}
            onChange={(e) => setPolicy({ ...policy, action: e.target.value })}
          />
          <Button variant="contained" onClick={() => run(() => api.createPolicy(policy), 'Rule created.')}>Add rule</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Create a user"
        help="Creates a new digital ID. You get the ID, a one-time password and a private key — these are shown once, so hand them to the person straight away. The private key is never stored on the server."
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <TextField size="small" label="Full name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          <TextField size="small" label="Staff number" value={newUser.employeeId} onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })} />
          <TextField size="small" label="Organization" value={newUser.organization} onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })} />
          <TextField size="small" label="Department (optional)" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
          <Button variant="contained" onClick={async () => {
            if (!newUser.name.trim() || !newUser.organization.trim()) { setMsg('A name and an organization are needed.'); return; }
            try {
              const r = await api.createUser({
                organization: newUser.organization.trim(),
                department: newUser.department.trim(),
                kycData: { name: newUser.name.trim(), employeeId: newUser.employeeId.trim() }
              });
              setCreated(r);
              setMsg(`User created. ${r.txHash ? `Recorded as ${r.txHash}.` : ''}`);
              policies.refetch();
            } catch (e) { setCreated(null); setMsg(e?.response?.data?.message || 'We could not create this user.'); }
          }}>Create user</Button>
        </Box>
        {created && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Copy these now — the password and key are never shown again.
            </Typography>
            {[
              ['Digital ID', created.did],
              ['One-time password', created.temporaryPassword],
              ['Private key', created.privateKey],
              ['Recorded as', created.txHash],
            ].map(([label, value]) => value ? (
              <Box key={label} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 150 }}>{label}:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>{value}</Typography>
                <Button size="small" onClick={() => { try { navigator.clipboard.writeText(value); } catch { /* clipboard unavailable */ } }}>Copy</Button>
              </Box>
            ) : null)}
          </Alert>
        )}
      </AdminSection>

      <AdminSection
        title="Give someone a role"
        help="A role decides what a person may do. For example, an organization admin may create users; a member may only look after their own files."
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Person (digital ID)" value={role.did} onChange={(e) => setRole({ ...role, did: e.target.value })} sx={{ minWidth: 240 }} />
          <TextField
            size="small"
            label="Role"
            helperText={`For example ${roleLabel('ORG_MEMBER')}`}
            value={role.role}
            onChange={(e) => setRole({ ...role, role: e.target.value })}
            sx={{ minWidth: 260 }}
          />
          <TextField size="small" label="Organization" value={role.organization} onChange={(e) => setRole({ ...role, organization: e.target.value })} />
          <Button variant="contained" onClick={() => run(() => api.assignRole(role.did, { role: role.role, organization: role.organization }), 'Role given.')}>Give role</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1.5 }}>
          {ROLE_OPTIONS.map((r) => (
            <Chip
              key={r}
              size="small"
              variant={role.role === r ? 'filled' : 'outlined'}
              label={roleLabel(r)}
              onClick={() => setRole({ ...role, role: r })}
            />
          ))}
        </Box>
      </AdminSection>

      <AdminSection
        title="Issue a certificate"
        help="A certificate is proof issued by your organization — for example, a security clearance with an expiry date. The person can then show it as evidence."
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Who is it for (digital ID)" value={vc.subjectDID} onChange={(e) => setVc({ ...vc, subjectDID: e.target.value })} sx={{ minWidth: 240 }} />
          <TextField size="small" label="Type of certificate" value={vc.credentialType} onChange={(e) => setVc({ ...vc, credentialType: e.target.value })} />
          <TextField
            size="small"
            label="Clearance level"
            helperText="Type CLEARANCE_LEVEL_1 … _4 or TOP_SECRET"
            value={vc.clearanceLevel}
            onChange={(e) => setVc({ ...vc, clearanceLevel: e.target.value })}
          />
          <TextField size="small" label="Expires on (optional)" placeholder="2027-01-31" value={vc.expirationDate} onChange={(e) => setVc({ ...vc, expirationDate: e.target.value })} />
          <Button variant="contained" onClick={() => run(() => api.issueCredential({
            subjectDID: vc.subjectDID,
            credentialType: vc.credentialType,
            attributes: { clearanceLevel: vc.clearanceLevel },
            ...(vc.expirationDate ? { expirationDate: vc.expirationDate } : {})
          }), 'Certificate issued.')}>Issue certificate</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Stop an identity"
        help="Suspending blocks an identity on a temporary basis — for example while something is investigated. Cancelling ends it for good. Both need a reason."
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Which identity (digital ID)" value={didOp.did} onChange={(e) => setDidOp({ ...didOp, did: e.target.value })} sx={{ minWidth: 240 }} />
          <TextField size="small" label="Reason (needed)" value={didOp.reason} onChange={(e) => setDidOp({ ...didOp, reason: e.target.value })} sx={{ minWidth: 220 }} />
          <Button variant="outlined" color="warning" onClick={() => run(() => api.suspendDID(didOp.did, didOp.reason), 'Identity suspended.')}>Suspend</Button>
          <Button variant="outlined" color="error" onClick={() => run(() => api.revokeDID(didOp.did, didOp.reason), 'Identity cancelled.')}>Cancel for good</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Open a file as a last resort"
        help="This ignores the normal rules so an administrator can open a file in an emergency. It is always recorded together with the reason you give, and it is meant to be rare."
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="File ID" placeholder="ASSET-…" value={override.resourceId} onChange={(e) => setOverride({ ...override, resourceId: e.target.value })} />
          <TextField size="small" label="Why (needed)" value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} sx={{ minWidth: 240 }} />
          <Button variant="contained" color="error" onClick={() => run(
            () => api.emergencyOverride({ resourceId: override.resourceId, reason: override.reason }),
            'Emergency access given.'
          )}>Open anyway</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Trace a leaked copy"
        help="Every protected view carries an invisible mark. If a leaked copy turns up, enter its mark to find which view it came from."
        raw={forensic}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Mark on the copy" value={displayId} onChange={(e) => setDisplayId(e.target.value)} />
          <Button variant="contained" onClick={async () => {
            try { setForensic(await api.watermarkLookup(displayId)); setMsg('The trace found the original view.'); }
            catch { setForensic(null); setMsg('We could not trace that mark.'); }
          }}>Trace it</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Organizations"
        help="Register a department or company so its people and files stay separate from other organizations."
        raw={orgs.data}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField size="small" label="Organization name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
          <TextField size="small" label="Technical short name" placeholder="Org1MSP" value={org.mspId} onChange={(e) => setOrg({ ...org, mspId: e.target.value })} />
          <Button variant="contained" onClick={() => run(() => api.registerOrganization(org), 'Organization added.')}>Add organization</Button>
        </Box>
      </AdminSection>

      <AdminSection
        title="Anything unusual?"
        help="Behaviour flagged while files were being viewed — for example, something that looked like an attempt to photograph the screen."
        raw={secEvents.data}
        rawLabel={`Technical details (${asList(secEvents.data).length} events)`}
      >
        {secEvents.isLoading
          ? <Typography variant="body2">Checking…</Typography>
          : asList(secEvents.data).length === 0
            ? <Typography variant="body2" color="text.secondary">Nothing flagged. That is good news.</Typography>
            : (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {secEvents.data.error
                  ? <Chip color="error" label="Could not load security events" />
                  : <Chip color="warning" label={`${asList(secEvents.data).length} event(s) need a look`} />}
              </Box>
            )}
      </AdminSection>
    </Box>
  );
}