# Asset Hub UI

## Sections
1. **My Assets** — Assets owned by current user
2. **Upload Asset** — File upload form with classification selector
3. **Asset Detail** — Metadata, provenance, access policy, actions

## Asset Card
Shows: asset ID (truncated), classification badge, owner, creation date, status.
Actions: View (if access granted), Transfer, Burn.

## Upload Form
- File picker (drag & drop)
- Classification selector (UNCLASSIFIED / CONFIDENTIAL / SECRET / TOP_SECRET)
- Auto-selects matching protection profile
- Upload progress indicator
- On complete: shows asset ID + tx hash

## Provenance Timeline
Asset Detail view shows full ownership history with tx hashes and timestamps.
