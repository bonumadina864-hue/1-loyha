import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  cipherText: Buffer;
  iv: Buffer;
  tag: Buffer;
}

export interface WrappedKey {
  wrappedKey: Buffer;
  iv: Buffer;
  tag: Buffer;
  kekId: string;
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly kek: Buffer;
  private readonly kekId: string = 'env-kek-v1';

  constructor(private readonly configService: ConfigService) {
    const kekHex = this.configService.get<string>('PAIRLY_KEK');
    if (!kekHex || kekHex.length !== 64) {
      throw new Error(
        'PAIRLY_KEK must be a 64-character hex string representing a 32-byte key.',
      );
    }
    this.kek = Buffer.from(kekHex, 'hex');
    this.logger.log('CryptoService initialized with Envelope Encryption (AES-256-GCM).');
  }

  /**
   * Generates a random 256-bit Data Encryption Key (DEK).
   */
  generateDek(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Wraps (encrypts) a pair DEK using the master Key Encryption Key (KEK).
   */
  wrapDek(dek: Buffer): WrappedKey {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.kek, iv);
    const wrappedKey = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      wrappedKey,
      iv,
      tag,
      kekId: this.kekId,
    };
  }

  /**
   * Unwraps (decrypts) a pair DEK using the master Key Encryption Key (KEK).
   */
  unwrapDek(wrappedKey: Buffer, iv: Buffer, tag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.kek, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(wrappedKey), decipher.final()]);
  }

  /**
   * Encrypts plaintext message content with the pair's DEK using AES-256-GCM.
   */
  encryptMessage(plainText: string, dek: Buffer): EncryptedPayload {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    const cipherText = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      cipherText,
      iv,
      tag,
    };
  }

  /**
   * Decrypts ciphertext message content with the pair's DEK using AES-256-GCM.
   */
  decryptMessage(
    cipherText: Buffer,
    dek: Buffer,
    iv: Buffer,
    tag: Buffer,
  ): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(cipherText),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
