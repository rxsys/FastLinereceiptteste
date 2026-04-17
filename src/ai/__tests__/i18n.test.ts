import { describe, it, expect } from 'vitest';
import { i18n, detectLang } from '../i18n';

describe('i18n - mensagens de registro de usuário LINE', () => {
  it('userRegistered retorna mensagem em japonês', () => {
    const msg = i18n('userRegistered', 'ja', 'Tanaka');
    expect(msg).toContain('Tanaka');
    expect(msg).toContain('✅');
  });

  it('userRegistered retorna mensagem em português', () => {
    const msg = i18n('userRegistered', 'pt', 'Ricardo');
    expect(msg).toContain('Ricardo');
    expect(msg).toContain('✅');
  });

  it('invalidCode retorna mensagem em japonês', () => {
    const msg = i18n('invalidCode', 'ja');
    expect(msg).toContain('⚠️');
  });

  it('codeUsed retorna mensagem em japonês', () => {
    const msg = i18n('codeUsed', 'ja');
    expect(msg).toContain('⚠️');
  });

  it('genericError retorna mensagem em japonês com texto correto', () => {
    const msg = i18n('genericError', 'ja');
    expect(msg).toContain('処理中にエラーが発生');
  });

  it('genericError retorna mensagem em pt', () => {
    const msg = i18n('genericError', 'pt');
    expect(msg).toContain('erro');
  });

  it('sendInviteCode retorna instrução em japonês', () => {
    const msg = i18n('sendInviteCode', 'ja');
    expect(msg).toContain('招待コード');
  });

  it('alreadyRegistered retorna mensagem em japonês', () => {
    const msg = i18n('alreadyRegistered', 'ja');
    expect(msg).toContain('✅');
    expect(msg).toContain('登録済み');
  });
});

describe('i18n - fallback de idioma', () => {
  it('idioma sem tradução cai para inglês', () => {
    const msg = i18n('invalidCode', 'en');
    expect(msg).toBeTruthy();
    expect(msg).not.toContain('[missing');
  });

  it('chave inexistente retorna [missing: key]', () => {
    const msg = i18n('chaveQueNaoExiste' as any, 'ja');
    expect(msg).toContain('[missing:');
  });
});

describe('detectLang', () => {
  it('detecta japonês por hiragana', () => {
    expect(detectLang('こんにちは')).toBe('ja');
  });

  it('detecta português', () => {
    expect(detectLang('obrigado pela confirmação')).toBe('pt');
  });

  it('detecta coreano', () => {
    expect(detectLang('안녕하세요')).toBe('ko');
  });

  it('default para japonês se idioma desconhecido', () => {
    expect(detectLang('hello world')).toBe('ja');
  });
});
