# Security Limitations

## Acknowledged Limitations

### Physical Security
The system cannot protect against:
- Physical access to display hardware
- Side-channel attacks against hardware
- Keystroke logging on user device
- Screen capture below the OS level

### Browser Security
The system cannot prevent:
- Compromised browser extensions intercepting content
- Malware on user device capturing screen
- OS-level screen recording
- User with legitimate access sharing their session

### Blockchain Limitations
- Transaction finality takes 0.5–2 seconds (window for race conditions)
- Fabric nodes must be majority honest (Byzantine fault tolerance is limited in Raft)
- Chaincode bugs could compromise on-chain state

### AI Anomaly Detection
- Isolation Forest generates false positives (tuned to ~5% contamination)
- Novel attack patterns not seen in training data may not be detected
- AI alerts are advisory; human review is required

### Camera Resistance
- Physical camera capture cannot be prevented by software
- Effectiveness varies by profile, device, display, and conditions
- Some cameras (global shutter, high frame rate) may be less affected
- Watermarking provides deterrence and forensic capability, not prevention

### Key Management
- If master key is compromised, all wrapped asset keys are at risk
- Key rotation requires re-encryption of all assets (operational overhead)
- Shamir's Secret Sharing requires trust in key share holders
