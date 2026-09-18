import { useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Typography, GlobalStyles } from '@mui/material';

// VaultField — vault-styled input: uppercase mono label, flat dark field with
// hairline border (integrated panel look, no glass), scan-line sweep on
// focus, password visibility toggle, and a subtle "encryption shimmer" that
// pulses while typing in password mode. Fully labelled + aria-wired.

const KEYFRAMES = `
@keyframes vaultScan {
  0% { left: -30%; opacity: 0; }
  25% { opacity: 0.7; }
  100% { left: 105%; opacity: 0; }
}
@keyframes vaultEncrypt {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.9; }
}
@media (prefers-reduced-motion: reduce) {
  .vault-scan, .vault-encrypt-dots span { animation: none !important; }
}
`;

const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.8" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

export default function VaultField({
  label, sublabel, helperText, type = 'text', value, onChange,
  autoComplete, required, error, mono = false, placeholder, inputRef, name
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <Box sx={{ mb: 2.6 }}>
      <GlobalStyles styles={KEYFRAMES} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.9 }}>
        <Typography
          component="label"
          htmlFor={`vf-${name}`}
          sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: focused ? '#5ecbff' : '#8fa3c8' }}
        >
          {label}
        </Typography>
        {sublabel && (
          <Typography sx={{ fontSize: 10.5, color: '#5d6f95', letterSpacing: '0.06em' }}>{sublabel}</Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          id={`vf-${name}`}
          name={name}
          inputRef={inputRef}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required={required}
          error={Boolean(error)}
          placeholder={placeholder}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            endAdornment: isPassword ? (
              <InputAdornment position="end">
                {/* tiny encryption visualization while typing */}
                {focused && value && (
                  <Box className="vault-encrypt-dots" aria-hidden="true" sx={{ display: 'flex', gap: 0.4, mr: 1 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Box key={i} component="span" sx={{
                        width: 3, height: 3, borderRadius: '50%', bgcolor: '#38bdf8',
                        animation: `vaultEncrypt 1.1s ease-in-out ${i * 0.12}s infinite`
                      }} />
                    ))}
                  </Box>
                )}
                <IconButton
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow((v) => !v)}
                  edge="end" size="small" sx={{ color: '#5d6f95', '&:hover': { color: '#9fc1e8' } }}
                >
                  <EyeIcon off={show} />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              px: 1.8, py: 1.35, borderRadius: 1,
              bgcolor: 'rgba(10,16,30,0.72)',
              border: '1px solid',
              borderColor: error ? 'rgba(220,80,80,0.65)' : focused ? 'rgba(80,160,255,0.65)' : 'rgba(90,120,180,0.22)',
              boxShadow: focused ? '0 0 0 1px rgba(80,160,255,0.25), 0 0 22px rgba(40,110,255,0.10)' : 'none',
              transition: 'border-color .18s, box-shadow .18s',
              '&:hover': { borderColor: error ? 'rgba(220,80,80,0.65)' : 'rgba(90,140,220,0.42)' }
            }
          }}
          inputProps={{
            'aria-invalid': Boolean(error),
            sx: {
              color: '#e8eefb', fontSize: 14.5,
              fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
              letterSpacing: mono ? '0.02em' : undefined,
              '&::placeholder': { color: '#48587a' }
            }
          }}
        />

        {/* scan-line sweep while focused */}
        {focused && (
          <Box
            className="vault-scan"
            aria-hidden="true"
            sx={{
              position: 'absolute', top: 0, bottom: 0, width: '30%', pointerEvents: 'none',
              background: 'linear-gradient(90deg, transparent, rgba(90,170,255,0.10), transparent)',
              animation: 'vaultScan 1.6s ease-in-out infinite'
            }}
          />
        )}
      </Box>

      {error ? (
        <Typography role="alert" sx={{ fontSize: 12, color: '#ff9d9d', mt: 0.8 }}>{error}</Typography>
      ) : helperText ? (
        <Typography sx={{ fontSize: 11.5, color: '#6f83a8', mt: 0.8, pl: 0.2 }}>{helperText}</Typography>
      ) : null}
    </Box>
  );
}
