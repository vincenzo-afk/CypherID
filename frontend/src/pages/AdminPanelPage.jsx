import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, TextField, Typography } from '@mui/material';
import { api } from '../services/api.js';

export default function AdminPanelPage() {
  const [msg, setMsg] = useState('');
  const [policy, setPolicy] = useState({ resourceId: '', requiredRole: 'CLEARANCE_LEVEL_1', action: 'READ' });
  const [displayId, setDisplayId] = useState('');
  const [forensic, setForensic] = useState(null);
  const [org, setOrg] = useState({ name: '', mspId: '' });
  const [role, setRole] = useState({ did: '', role: 'ORG_MEMBER', organization: '' });
  const [vc, setVc] = useState({ subjectDID: '', credentialType: 'SecurityClearance', clearanceLevel: 'CLEARANCE_LEVEL_3', expirationDate: '' });
  const [didOp, setDidOp] = useState({ did: '', reason: '' });
  const [override, setOverride] = useState({ resourceId: '', reason: '' });

  const policies = useQuery({ queryKey: ['policies'], queryFn: () => api.listPolicies().catch(() => []) });
  const orgs = useQuery({ queryKey: ['orgs'], queryFn: () => api.listOrganizations().catch(() => []) });
  const secEvents = useQuery({ queryKey: ['secEvents'], queryFn: () => api.securityEvents().catch(() => []) });
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.health().catch((e) => ({ error: 'unreachable' })) });
  const fabricHealth = useQuery({ queryKey: ['fabricHealth'], queryFn: () => api.fabricHealth().catch(() => ({ error: 'FABRIC_UNAVAILABLE' })) });

  const run = async (fn, ok) => {
    try { const r = await fn(); setMsg(ok + (r?.txHash ? ` Tx: ${r.txHash}` : '')); policies.refetch(); orgs.refetch(); }
    catch (e) { setMsg(e?.response?.data?.message || 'Operation failed — check role and backend.'); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Admin Panel (ORG_ADMIN)</Typography>
      {msg && <Typography sx={{ mb: 2 }}>{msg}</Typography>}

      <Typography variant="h6">System Health</Typography>
      <pre style={{ maxHeight: 120, overflow: 'auto' }}>{JSON.stringify({ service: health.data, fabric: fabricHealth.data }, null, 2)}</pre>

      <Typography variant="h6" sx={{ mt: 2 }}>Access Policies</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Resource ID" value={policy.resourceId} onChange={(e) => setPolicy({ ...policy, resourceId: e.target.value })} />
        <TextField size="small" label="Required role" value={policy.requiredRole} onChange={(e) => setPolicy({ ...policy, requiredRole: e.target.value })} />
        <TextField size="small" label="Action" value={policy.action} onChange={(e) => setPolicy({ ...policy, action: e.target.value })} />
        <Button variant="contained" onClick={() => run(() => api.createPolicy(policy), 'Policy created.')}>Create</Button>
      </Box>
      <pre style={{ maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(policies.data, null, 2)}</pre>

      <Typography variant="h6" sx={{ mt: 2 }}>Issue Verifiable Credential (org admin)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Subject DID" value={vc.subjectDID} onChange={(e) => setVc({ ...vc, subjectDID: e.target.value })} />
        <TextField size="small" label="Credential type" value={vc.credentialType} onChange={(e) => setVc({ ...vc, credentialType: e.target.value })} />
        <TextField size="small" label="Clearance level" value={vc.clearanceLevel} onChange={(e) => setVc({ ...vc, clearanceLevel: e.target.value })} />
        <TextField size="small" label="Expiry (ISO date, optional)" value={vc.expirationDate} onChange={(e) => setVc({ ...vc, expirationDate: e.target.value })} />
        <Button variant="contained" onClick={() => run(() => api.issueCredential({
          subjectDID: vc.subjectDID,
          credentialType: vc.credentialType,
          attributes: { clearanceLevel: vc.clearanceLevel },
          ...(vc.expirationDate ? { expirationDate: vc.expirationDate } : {})
        }), 'Credential issued.')}>Issue VC</Button>
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>DID Lifecycle (admin)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Target DID" value={didOp.did} onChange={(e) => setDidOp({ ...didOp, did: e.target.value })} />
        <TextField size="small" label="Reason" value={didOp.reason} onChange={(e) => setDidOp({ ...didOp, reason: e.target.value })} />
        <Button variant="outlined" color="warning" onClick={() => run(() => api.suspendDID(didOp.did, didOp.reason), 'DID suspended.')}>Suspend</Button>
        <Button variant="outlined" color="error" onClick={() => run(() => api.revokeDID(didOp.did, didOp.reason), 'DID revoked.')}>Revoke</Button>
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>Emergency Override (SUPER_ADMIN, fully audited)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Resource ID" value={override.resourceId} onChange={(e) => setOverride({ ...override, resourceId: e.target.value })} />
        <TextField size="small" label="Justification (required)" value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} />
        <Button variant="contained" color="error" onClick={() => run(
          () => api.emergencyOverride({ resourceId: override.resourceId, reason: override.reason }),
          'Emergency override granted.'
        )}>Override</Button>
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>Watermark Forensics (audited)</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField size="small" label="Display ID" value={displayId} onChange={(e) => setDisplayId(e.target.value)} />
        <Button variant="contained" onClick={async () => {
          try { setForensic(await api.watermarkLookup(displayId)); setMsg('Forensic lookup complete.'); }
          catch { setMsg('Lookup failed.'); }
        }}>Lookup</Button>
      </Box>
      {forensic && <pre>{JSON.stringify(forensic, null, 2)}</pre>}

      <Typography variant="h6" sx={{ mt: 2 }}>Organizations (SUPER_ADMIN)</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Org name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
        <TextField size="small" label="MSP ID" value={org.mspId} onChange={(e) => setOrg({ ...org, mspId: e.target.value })} />
        <Button variant="contained" onClick={() => run(() => api.registerOrganization(org), 'Organization registered.')}>Register</Button>
      </Box>
      <pre style={{ maxHeight: 120, overflow: 'auto' }}>{JSON.stringify(orgs.data, null, 2)}</pre>

      <Typography variant="h6" sx={{ mt: 2 }}>Assign Role</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="User DID" value={role.did} onChange={(e) => setRole({ ...role, did: e.target.value })} />
        <TextField size="small" label="Role" value={role.role} onChange={(e) => setRole({ ...role, role: e.target.value })} />
        <TextField size="small" label="Organization" value={role.organization} onChange={(e) => setRole({ ...role, organization: e.target.value })} />
        <Button variant="contained" onClick={() => run(() => api.assignRole(role.did, { role: role.role, organization: role.organization }), 'Role assigned.')}>Assign</Button>
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>Security Events</Typography>
      <pre style={{ maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(secEvents.data, null, 2)}</pre>
    </Box>
  );
}
