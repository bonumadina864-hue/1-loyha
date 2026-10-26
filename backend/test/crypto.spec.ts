import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../src/modules/crypto/crypto.service';

describe('CryptoService (Envelope Encryption)', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'PAIRLY_KEK') {
                return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a 32-byte DEK', () => {
    const dek = service.generateDek();
    expect(dek).toBeInstanceOf(Buffer);
    expect(dek.length).toBe(32);
  });

  it('should wrap and unwrap a DEK successfully with master KEK', () => {
    const dek = service.generateDek();
    const wrapped = service.wrapDek(dek);

    expect(wrapped.wrappedKey).toBeDefined();
    expect(wrapped.iv.length).toBe(12);
    expect(wrapped.tag.length).toBe(16);

    const unwrapped = service.unwrapDek(wrapped.wrappedKey, wrapped.iv, wrapped.tag);
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it('should encrypt and decrypt a message payload with AES-256-GCM', () => {
    const dek = service.generateDek();
    const plainText = 'Strict 1-on-1 private chat test message 🔒';

    const encrypted = service.encryptMessage(plainText, dek);
    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv.length).toBe(12);
    expect(encrypted.tag.length).toBe(16);

    const decrypted = service.decryptMessage(
      encrypted.cipherText,
      dek,
      encrypted.iv,
      encrypted.tag,
    );

    expect(decrypted).toBe(plainText);
  });

  it('should fail decryption if auth tag is modified (tamper resistance)', () => {
    const dek = service.generateDek();
    const plainText = 'Authenticity test';
    const encrypted = service.encryptMessage(plainText, dek);

    // Tamper with auth tag
    encrypted.tag[0] ^= 0xff;

    expect(() => {
      service.decryptMessage(
        encrypted.cipherText,
        dek,
        encrypted.iv,
        encrypted.tag,
      );
    }).toThrow();
  });
});
