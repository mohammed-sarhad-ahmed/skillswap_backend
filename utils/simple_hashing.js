import crypto from 'crypto';

export default function simpleHash(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}
