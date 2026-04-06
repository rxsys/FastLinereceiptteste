import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'; // Garante que o Next.js não tente pré-renderizar esta rota no build

/**
 * Endpoint para servir imagens de recibos armazenadas no Firestore.
 * Necessário para que o LINE possa exibir as imagens (exige URL pública).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params;

  try {
    const doc = await db.collection('expenses').doc(expenseId).get();
    if (!doc.exists) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const data = doc.data();
    const imageUrl = data?.imageUrl;

    if (!imageUrl || !imageUrl.startsWith('data:image')) {
      return new NextResponse('No image found', { status: 404 });
    }

    // Extrair os dados base64
    const parts = imageUrl.split(',');
    const base64Data = parts[parts.length - 1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Identificar o tipo de conteúdo
    let contentType = 'image/jpeg';
    const match = imageUrl.match(/^data:(image\/[a-z]+);base64/);
    if (match) {
      contentType = match[1];
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache de 24h
      },
    });
  } catch (error) {
    console.error('[ImageAPI] Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
