export interface DemoAuthAccount {
  username: string;
  email: string;
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

export interface DemoSession {
  username: string;
  signedInAt: string;
}

const AUTH_ACCOUNT_STORAGE_KEY = 'ecr_kolwezi_demo_auth_account_v1';
const AUTH_SESSION_STORAGE_KEY = 'ecr_kolwezi_demo_auth_session_v1';

// Precomputed salted SHA-256 hash for the initial demo administrator account ("admin").
// Plaintext password is never stored in browser storage or placed in source code.
const INITIAL_ADMIN_SALT = 'ecr_kolwezi_salt_2026';
const INITIAL_ADMIN_PASSWORD_HASH =
  '5f4ecc923bdf78494036e3bb2bc7212d399ddb80719157e8cddce4a0baa167d0';

/**
 * Standard FIPS 180-4 SHA-256 implementation (synchronous, works in all browser/iframe contexts).
 */
export function sha256Hex(asciiInput: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const utf8Bytes = new TextEncoder().encode(asciiInput);
  const bitLength = utf8Bytes.length * 8;

  // Padding: append 0x80, then 0x00 until length % 64 === 56, then 64-bit big-endian bit length
  const totalLen = (((utf8Bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(totalLen);
  padded.set(utf8Bytes);
  padded[utf8Bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(totalLen - 4, bitLength >>> 0, false);

  const W = new Uint32Array(64);

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rightRotate(W[i - 15], 7) ^
        rightRotate(W[i - 15], 18) ^
        (W[i - 15] >>> 3);
      const s1 =
        rightRotate(W[i - 2], 17) ^
        rightRotate(W[i - 2], 19) ^
        (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((word) => word.toString(16).padStart(8, '0')).join('');
}

export function computeSaltedHash(salt: string, password: string): string {
  return sha256Hex(`${salt}:${password}`);
}

function generateSalt(): string {
  const randomPart = Math.random().toString(36).substring(2, 12);
  const timePart = Date.now().toString(36);
  return `ecr_salt_${timePart}_${randomPart}`;
}

function createInitialAdminAccount(): DemoAuthAccount {
  return {
    username: 'admin',
    email: 'admin@demo.ecr-kolwezi.org',
    salt: INITIAL_ADMIN_SALT,
    passwordHash: INITIAL_ADMIN_PASSWORD_HASH,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ensures the demo administrator account exists in localStorage.
 * Creates the initial account ONLY when no demo account exists.
 */
export function getOrInitializeDemoAccount(): DemoAuthAccount {
  try {
    const raw = localStorage.getItem(AUTH_ACCOUNT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoAuthAccount;
      if (
        parsed &&
        typeof parsed.username === 'string' &&
        typeof parsed.salt === 'string' &&
        typeof parsed.passwordHash === 'string'
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback below
  }

  const initial = createInitialAdminAccount();
  try {
    localStorage.setItem(AUTH_ACCOUNT_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignore storage errors
  }
  return initial;
}

/**
 * Verifies username/email and password against the stored salted password hash.
 */
export function verifyCredentials(
  identifierInput: string,
  passwordInput: string
): { valid: boolean; account?: DemoAuthAccount; error?: string } {
  const idTrimmed = identifierInput.trim();
  if (!idTrimmed || !passwordInput) {
    return {
      valid: false,
      error: 'Please enter both your email/username and password.',
    };
  }

  const account = getOrInitializeDemoAccount();
  const isUserMatch =
    idTrimmed === account.username ||
    idTrimmed.toLowerCase() === account.email.toLowerCase();

  if (!isUserMatch) {
    return {
      valid: false,
      error: 'Invalid username/email or password. Please check your credentials and try again.',
    };
  }

  const candidateHash = computeSaltedHash(account.salt, passwordInput);
  if (candidateHash !== account.passwordHash) {
    return {
      valid: false,
      error: 'Invalid username/email or password. Please check your credentials and try again.',
    };
  }

  return { valid: true, account };
}

/**
 * Changes the demo administrator password after verifying current credentials.
 */
export function changeDemoPassword(params: {
  usernameInput: string;
  currentPasswordInput: string;
  newPasswordInput: string;
  confirmPasswordInput: string;
}): { success: boolean; error?: string } {
  const {
    usernameInput,
    currentPasswordInput,
    newPasswordInput,
    confirmPasswordInput,
  } = params;

  if (!usernameInput.trim()) {
    return { success: false, error: 'Please enter your username.' };
  }
  if (!currentPasswordInput) {
    return { success: false, error: 'Please enter your current password.' };
  }
  if (!newPasswordInput) {
    return { success: false, error: 'Please enter a new password.' };
  }
  if (newPasswordInput.length < 6) {
    return {
      success: false,
      error: 'New password must be at least 6 characters long.',
    };
  }
  if (newPasswordInput !== confirmPasswordInput) {
    return {
      success: false,
      error: 'New password and confirmation password do not match.',
    };
  }

  const verification = verifyCredentials(usernameInput, currentPasswordInput);
  if (!verification.valid || !verification.account) {
    return {
      success: false,
      error: 'Current username or current password is incorrect.',
    };
  }

  if (currentPasswordInput === newPasswordInput) {
    return {
      success: false,
      error: 'Please choose a new password that is different from your current password.',
    };
  }

  const newSalt = generateSalt();
  const newPasswordHash = computeSaltedHash(newSalt, newPasswordInput);

  const updatedAccount: DemoAuthAccount = {
    ...verification.account,
    salt: newSalt,
    passwordHash: newPasswordHash,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_ACCOUNT_STORAGE_KEY, JSON.stringify(updatedAccount));
  } catch {
    return {
      success: false,
      error: 'Unable to save the updated password in browser storage.',
    };
  }

  return { success: true };
}

/**
 * Restores ONLY the initial practice login credentials without touching church records.
 */
export function resetDemoLoginOnly(): DemoAuthAccount {
  const initial = createInitialAdminAccount();
  try {
    localStorage.setItem(AUTH_ACCOUNT_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // Ignore storage errors
  }
  return initial;
}

export function loadActiveSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoSession;
      if (parsed && typeof parsed.username === 'string') {
        return parsed;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function saveActiveSession(username: string): DemoSession {
  const session: DemoSession = {
    username,
    signedInAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore errors
  }
  return session;
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
