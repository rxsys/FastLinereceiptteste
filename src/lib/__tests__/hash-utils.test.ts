import { describe, it, expect } from 'vitest';
import { extractInviteHash, isValidInviteHash, buildQrMessage } from '../hash-utils';

describe('extractInviteHash', () => {
  it('extrai hash hex puro', () => {
    expect(extractInviteHash('1A2B3C4D')).toBe('1A2B3C4D');
  });

  it('extrai hash com # prefix (formato QR)', () => {
    expect(extractInviteHash('#1A2B3C4D')).toBe('1A2B3C4D');
  });

  it('extrai hash em minúsculas e normaliza para maiúsculas', () => {
    expect(extractInviteHash('#1a2b3c4d')).toBe('1A2B3C4D');
  });

  it('extrai hash corretamente da mensagem QR antiga (bug REGISTRO)', () => {
    // Antes do fix, "REGISTRO" era extraído no lugar do hash real
    expect(extractInviteHash('REGISTRO / #1A2B3C4D')).toBe('1A2B3C4D');
  });

  it('não casa com palavras comuns de 8 letras', () => {
    expect(extractInviteHash('REGISTRO')).toBeNull();
    expect(extractInviteHash('FEEDBACK')).toBeNull();
    expect(extractInviteHash('SCHEDULE')).toBeNull();
  });

  it('não casa com string vazia', () => {
    expect(extractInviteHash('')).toBeNull();
  });

  it('extrai hash de mensagem com texto ao redor', () => {
    expect(extractInviteHash('Meu código é #AB12CD34 obrigado')).toBe('AB12CD34');
  });

  it('retorna null se não houver 8 hex consecutivos', () => {
    expect(extractInviteHash('Olá como vai')).toBeNull();
    expect(extractInviteHash('1234567')).toBeNull(); // 7 chars
    expect(extractInviteHash('#GHIJKLMN')).toBeNull(); // letras não-hex
  });

  it('hash gerado por crypto.randomBytes(4).toString(hex) sempre casa', () => {
    const exemplos = ['A1B2C3D4', 'FF00AABC', '12345678', 'DEADBEEF', '0F0F0F0F'];
    for (const h of exemplos) {
      expect(extractInviteHash(`#${h}`)).toBe(h);
    }
  });
});

describe('isValidInviteHash', () => {
  it('valida hash hex de 8 chars', () => {
    expect(isValidInviteHash('1A2B3C4D')).toBe(true);
    expect(isValidInviteHash('DEADBEEF')).toBe(true);
  });

  it('rejeita hash com chars não-hex', () => {
    expect(isValidInviteHash('REGISTRO')).toBe(false);
    expect(isValidInviteHash('GGGGGGGG')).toBe(false);
  });

  it('rejeita tamanho incorreto', () => {
    expect(isValidInviteHash('1A2B3C4')).toBe(false);   // 7 chars
    expect(isValidInviteHash('1A2B3C4DE')).toBe(false); // 9 chars
  });
});

describe('buildQrMessage', () => {
  it('formata mensagem QR com # prefix', () => {
    expect(buildQrMessage('1A2B3C4D')).toBe('#1A2B3C4D');
  });
});
