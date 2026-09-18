// Minimal QR encoder (byte mode, error-correction level M) producing an SVG
// path — zero dependencies. Used ONLY for the public DID string: never encode
// passwords, keys, seeds or tokens.
//
// Based on the QR specification (ISO/IEC 18004). Implements versions 1–10
// with the Reed–Solomon tables for level M, which is ample for a DID.

const SIZE_TABLE = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57]; // versions 1..10

// ECC codewords per block + block structure for level M, versions 1..10:
// [totalCodewords, [(numBlocks, eccPerBlock), ...]]
const EC_M = {
  total: [26, 44, 70, 100, 134, 172, 196, 242, 292, 346],
  blocks: [[1, 16], [1, 28], [1, 44], [2, 26], [2, 18], [4, 24], [2, 32], [4, 22], [6, 22], [8, 20]],
  data: [16, 28, 44, 2 * 24, 2 * 32, 4 * 14, 2 * 32, 4 * 26, 6 * 26, 8 * 22]
};

// Capacity in bytes for level M (data codewords minus 2 header bytes approx):
const CAPACITY = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmul(poly[j], GF_EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly.reverse(); // highest degree first
}

function rsEncode(data, eccLen) {
  const gen = rsGenerator(eccLen);
  const res = new Array(eccLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) {
      for (let i = 0; i < eccLen; i++) res[i] ^= gmul(gen[i], factor);
    }
  }
  return res;
}

const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
};

function buildMatrix(bytes, version) {
  const n = SIZE_TABLE[version - 1];
  const m = Array.from({ length: n }, () => new Array(n).fill(null)); // null = unset

  const setFinder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const inRing = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) || (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        m[rr][cc] = inRing || inCore ? 1 : 0;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, n - 7);
  setFinder(n - 7, 0);

  // alignment patterns
  const centers = ALIGN[version];
  for (const r of centers) {
    for (const c of centers) {
      if (m[r][c] !== null) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          m[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0;
        }
      }
    }
  }

  // timing patterns
  for (let i = 8; i < n - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // dark module + reserve format areas
  m[n - 8][8] = 1;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] === null) m[8][i] = 0;
    if (m[i][8] === null) m[i][8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][n - 1 - i] === null) m[8][n - 1 - i] = 0;
    if (m[n - 1 - i][8] === null) m[n - 1 - i][8] = 0;
  }

  // place data (zigzag from bottom-right, skipping column 6)
  const total = EC_M.total[version - 1] * 8;
  const bits = [];
  for (const b of bytes) bits.push((b & 0x80) >> 7, (b & 0x40) >> 6, (b & 0x20) >> 5, (b & 0x10) >> 4, (b & 0x08) >> 3, (b & 0x04) >> 2, (b & 0x02) >> 1, b & 1);
  let bitIdx = 0;
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const row = upward ? n - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (m[row][c] === null) {
          m[row][c] = bitIdx < bits.length ? bits[bitIdx] : 0;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }
  void total;

  // format info: level M (00) + mask 0 — computed with the standard BCH code
  const fmtRaw = 0x00 << 3 | 0; // level M bits (00) with mask 0
  let fmt = fmtRaw;
  let rem = fmt;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) & 1) * 0x537;
  fmt = ((fmt << 10) | rem) ^ 0x5412;
  const fmtBits = [];
  for (let i = 14; i >= 0; i--) fmtBits.push((fmt >> i) & 1);
  const place = (idx, r, c) => { m[r][c] = fmtBits[idx]; };
  for (let i = 0; i <= 5; i++) place(i, 8, i);
  place(6, 8, 7); place(7, 8, 8); place(8, 7, 8);
  for (let i = 9; i < 15; i++) place(i, 14 - i, 8);
  for (let i = 0; i < 8; i++) place(i, 8, n - 1 - i);
  for (let i = 8; i < 15; i++) place(i, 8, 14 - i + 8 - 8 + (n - 15) + (i - 8)) || (m[8][(n - 15) + (i - 8) + 0] = fmtBits[i]);
  // simple safe pass for the second copy (covers versions where math above shifts)
  for (let i = 0; i < 15; i++) {
    const c = n - 1 - i;
    if (c >= 0 && m[8][c] !== undefined && c > 7) m[8][c] = fmtBits[i];
  }

  // mask 0 (i % 2 === 0) applied to data modules only: we masked everything
  // reserved above, so flip remaining non-finder data cells per the pattern.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if ((r < 9 && c < 9) || (r < 9 && c >= n - 8) || (r >= n - 8 && c < 9)) continue;
      if (r === 6 || c === 6) continue;
      if (r % 2 === 0) m[r][c] ^= 1;
    }
  }

  return m;
}

export function qrMatrix(text) {
  const data = new TextEncoder().encode(text);
  let version = 1;
  while (version <= 10 && CAPACITY[version - 1] < data.length + 2) version++;
  if (version > 10) throw new Error('payload too long for compact QR');

  // bit stream: mode 0100, char count (8 bits for v1-9 byte mode), data, terminator, pad
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(4, 4);
  push(data.length, 8);
  for (const b of data) push(b, 8);
  const dataCodewords = EC_M.data[version - 1];
  const capacityBits = dataCodewords * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  let bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(bits.slice(i, i + 8).reduce((a, b, j) => a | (b << (7 - j)), 0));
  }
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bytes.length < dataCodewords) bytes.push(pads[pi++ % 2]);

  // split into blocks, compute ECC, interleave
  const [numBlocks, eccPerBlock] = EC_M.blocks[version - 1];
  const shortBlock = Math.floor(bytes.length / numBlocks);
  const blocks = [];
  const eccs = [];
  for (let i = 0; i < numBlocks; i++) {
    const b = bytes.slice(i * shortBlock, (i + 1) * shortBlock);
    blocks.push(b);
    eccs.push(rsEncode(b, eccPerBlock));
  }
  const interleaved = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) {
    for (const b of blocks) if (i < b.length) interleaved.push(b[i]);
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const e of eccs) interleaved.push(e[i]);
  }

  return { matrix: buildMatrix(interleaved, version), size: SIZE_TABLE[version - 1] };
}

// Render as an SVG path string (one rect per dark module via path for compactness)
export function qrPath(text, quietZone = 2) {
  const { matrix, size } = qrMatrix(text);
  let d = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) d += `M${c + quietZone} ${r + quietZone}h1v1h-1z`;
    }
  }
  return { d, size: size + quietZone * 2 };
}
