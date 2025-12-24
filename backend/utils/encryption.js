const crypto = require('crypto');

// Configuration
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

// Use environment variable or a stable fallback for development
// In production, CHAT_ENCRYPTION_KEY must be a 32-byte hex string
let KEY;
if (process.env.CHAT_ENCRYPTION_KEY) {
    KEY = Buffer.from(process.env.CHAT_ENCRYPTION_KEY, 'hex');
} else {
    // Stable fallback key for development (32 chars)
    // WARNING: Do not use this in production
    KEY = Buffer.from('12345678901234567890123456789012', 'utf8');
}

const encrypt = (text) => {
    try {
        if (!text) return text;

        // Generate a random initialization vector
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV + Encrypted Data (separated by colon)
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('Encryption error:', err);
        return text; // Fallback: return original text if failed
    }
};

const decrypt = (text) => {
    try {
        if (!text) return text;

        // Check if text is in format IV:Encrypted
        const parts = text.split(':');
        if (parts.length !== 2) {
            // Not encrypted (legacy data), return as is
            return text;
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

        // Decrypt
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        // If decryption fails (e.g. wrong key, bad data), return original
        // This handles cases where unencrypted text might contain a colon
        // console.error('Decryption error:', err);
        return text;
    }
};

module.exports = { encrypt, decrypt };
