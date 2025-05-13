// src/services/encryptionService.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = process.env.ENCRYPTION_KEY || '32characterslongsecretkey!!'; // Must be 32 bytes
const IV_LENGTH = 16;

export const credentialService = {
  encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  },

  decrypt(text: string) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift() as string, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  },
};
