const HASH_REGEX = /([A-Z0-9]{8})/i;

export function extractInviteHash(text: string): string | null {
  const match = text.match(HASH_REGEX);
  return match ? match[1].toUpperCase() : null;
}

export function isValidInviteHash(value: string): boolean {
  return HASH_REGEX.test(value) && value.length === 8;
}

export function buildQrMessage(hash: string): string {
  return `#${hash}`;
}
