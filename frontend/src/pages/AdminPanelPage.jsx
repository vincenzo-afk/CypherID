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

      <Typography variant="h6" sx={{ mt: 2 }}>Create User (admin)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Registers a DID on-chain. Hand the DID + temporary password + private key to the user once — the private key is never stored server-side.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <TextField size="small" label="Full name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
        <TextField size="small" label="Employee ID" value={newUser.employeeId} onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })} />
        <TextField size="small" label="Organization" value={newUser.organization} onChange={(e) => setNewUser({ ...newUser, organization: e.target.value })} />
        <TextField size="small" label="Department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
        <Button variant="contained" onClick={async () => {
          if (!newUser.name.trim() || !newUser.organization.trim()) { setMsg('Name and organization are required.'); return; }
          try {
            const r = await api.createDID({
              organization: newUser.organization.trim(),
              department: newUser.department.trim(),
              kycData: { name: newUser.name.trim(), employeeId: newUser.employeeId.trim() }
            });
            setCreated(r);
            setMsg(`User created on-chain. Tx: ${r.txHash || 'recorded'}.`);
            policies.refetch();
          } catch (e) { setCreated(null); setMsg(e?.response?.data?.message || 'User creation failed.'); }
        }}>Create user</Button>
      </Box>
      {created && (
        <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="warning.main">One-time credentials — copy now, they will not be shown again.</Typography>
          {[
            ['DID', created.did],
            ['Temporary password', 'CypherID@2026!'],
            ['Private key (base64)', created.privateKey],
            ['Tx hash', created.txHash],
          ].map(([label, value]) => value ? (
            <Box key={label} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 170 }}>{label}:</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>{value}</Typography>
              <Button size="small" onClick={() => { try { navigator.clipboard.writeText(value); } catch { /* clipboard unavailable */ } }}>Copy</Button>
            </Box>
          ) : null)}
        </Box>
      )}

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
