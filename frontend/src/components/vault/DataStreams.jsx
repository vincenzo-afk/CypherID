import { Box, GlobalStyles } from '@mui/material';

// DataStreams — ambient background for the vault page: faint cryptographic
// glyph grid + slow horizontal data streams. Pure CSS animations (compositor
// friendly), honors prefers-reduced-motion via a media query.

const KEYFRAMES = `
@keyframes vaultStream {
  0% { transform: translateX(-12%); opacity: 0; }
  8% { opacity: var(--stream-o, 0.16); }
  92% { opacity: var(--stream-o, 0.16); }
  100% { transform: translateX(112vw); opacity: 0; }
}
@keyframes vaultGlyphShift {
  0% { background-position: 0 0; }
  100% { background-position: 44px 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .vault-stream, .vault-glyphs { animation: none !important; }
}
`;

const GLYPHS = '0123456789abcdef≡∂∑λπ#';

const streams = Array.from({ length: 5 }, (_, i) => ({
  top: 12 + i * 18 + (i % 2) * 4,
  width: 180 + (i * 97) % 260,
  duration: 26 + i * 9,
  delay: -i * 7,
  opacity: 0.1 + (i % 3) * 0.05,
  hue: i % 3 === 0 ? '0,190,255' : i % 3 === 1 ? '80,130,255' : '150,120,255'
}));

export default function DataStreams() {
  return (
    <Box aria-hidden="true" sx={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: '#05070D' }}>
      <GlobalStyles styles={KEYFRAMES} />

      {/* faint cryptographic glyph grid */}
      <Box
        className="vault-glyphs"
        sx={{
          position: 'absolute', inset: '-44px', opacity: 0.35,
          backgroundImage: `radial-gradient(rgba(70,110,180,0.16) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          animation: 'vaultGlyphShift 60s linear infinite'
        }}
      />

      {/* scattered mono glyph impressions (static, decorative) */}
      {Array.from({ length: 26 }).map((_, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            left: `${(i * 137) % 97}%`,
            top: `${(i * 61) % 92}%`,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 10,
            color: 'rgba(90,130,200,0.14)',
            userSelect: 'none'
          }}
        >
          {GLYPHS[(i * 7) % GLYPHS.length]}{GLYPHS[(i * 13) % GLYPHS.length]}
        </Box>
      ))}

      {/* horizontal data streams */}
      {streams.map((s, i) => (
        <Box
          key={i}
          className="vault-stream"
          sx={{
            position: 'absolute', left: 0, top: `${s.top}%`,
            width: s.width, height: 1,
            background: `linear-gradient(90deg, transparent, rgba(${s.hue},0.9), transparent)`,
            '--stream-o': s.opacity,
            animation: `vaultStream ${s.duration}s linear ${s.delay}s infinite`
          }}
        />
      ))}

      {/* vignette to seat the content */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 30% 40%, transparent 40%, rgba(3,4,9,0.75) 100%)'
      }} />
    </Box>
  );
}
