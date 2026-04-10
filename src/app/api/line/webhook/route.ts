import { NextResponse } from 'next/server';

/**
 * Este endpoint estático foi substituído pelo dinâmico /api/line/webhook/[ownerId].
 * Redirecionando ou retornando erro para evitar confusão.
 */
export async function POST() {
  return new NextResponse('Please use the owner-specific webhook URL: /api/line/webhook/[ownerId]', { status: 400 });
}