import { Chip, Tooltip } from '@mui/material';

// On-chain evidence badge: full tx hash on hover, truncated display.
// Renders nothing when there is no hash — never a placeholder.
export default function BlockchainTxBadge({ txHash, maxLength = 18 }) {
  if (!txHash) return null;
  const short = txHash.length > maxLength ? `${txHash.slice(0, maxLength)}…` : txHash;
  return (
    <Tooltip title={txHash}>
      <Chip label={`⛓ ${short}`} size="small" variant="outlined" />
    </Tooltip>
  );
}
