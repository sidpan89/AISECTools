// backend/src/services/encryptionService.ts
import crypto from 'crypto';
import logger from '../utils/logger'; // Import logger

const ALGORITHM = 'aes-256-cbc';
// const KEY = process.env.ENCRYPTION_KEY || '32characterslongsecretkey!!'; // Must be 32 bytes - Old way
const IV_LENGTH = 16;

let encryptionKey: Buffer;

function initializeEncryptionKey() {
   const envKey = process.env.ENCRYPTION_KEY;
   if (!envKey) {
       logger.error('FATAL ERROR: ENCRYPTION_KEY is not defined. Please set it in your environment variables or .env file. It must be a 64-character hex string (for 32 bytes).');
       process.exit(1);
   }
   if (Buffer.from(envKey, 'hex').length !== 32) {
       logger.error('FATAL ERROR: ENCRYPTION_KEY must be a 64-character hex string representing 32 bytes.');
       process.exit(1);
   }
   encryptionKey = Buffer.from(envKey, 'hex');
   logger.info('Encryption service initialized with key from ENCRYPTION_KEY.');
}

initializeEncryptionKey(); // Call on module load

export const credentialService = { // Renamed from encryptionService in some contexts, but this is the service itself
  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv); // Use the Buffer key
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  decrypt(text: string): string {
    const parts = text.split(':');
    const ivHex = parts.shift();
    if (!ivHex || ivHex.length !== IV_LENGTH * 2) { // IV_LENGTH * 2 because it's hex
       logger.error('Decryption failed: IV is missing or has incorrect length.');
       throw new Error('Decryption failed: Invalid IV format.');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv); // Use the Buffer key
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.toString(); // No need for another .toString() if already string
  },
};
