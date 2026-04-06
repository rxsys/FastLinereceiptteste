import { NextResponse } from 'next/server';
import { auth, rtdb } from '@/lib/firebase';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const userSnap = await rtdb.ref(`users/${decoded.uid}`).get();
    const userData = userSnap.val();
    if (!userData?.ownerId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const ownerId: string = userData.ownerId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Lê uso do mês atual + 2 meses anteriores
    const months = [0, 1, 2].map(n => {
      const d = new Date();
      d.setMonth(d.getMonth() - n);
      return d.toISOString().slice(0, 7);
    });

    const snaps = await Promise.all(
      months.map(m => rtdb.ref(`owner_data/${ownerId}/ai_usage/${m}`).get())
    );

    const history = months.map((m, i) => ({
      month: m,
      ...(snaps[i].val() || { input: 0, output: 0, total: 0, requests: 0 })
    }));

    const current = history[0];

    // Custo estimado (Gemini Flash médio)
    const costUSD = (current.input / 1_000_000 * 0.075) + (current.output / 1_000_000 * 0.30);
    const estimatedCostYen = Math.round(costUSD * 150);

    // Saldo de tokens comprados
    const [balSnap, ownerSnap] = await Promise.all([
      rtdb.ref(`owner/${ownerId}/tokenBalance`).get(),
      rtdb.ref(`owner/${ownerId}/tokenUsed`).get(),
    ]);

    return NextResponse.json({
      ownerId,
      currentMonth,
      tokens: {
        input: current.input || 0,
        output: current.output || 0,
        total: current.total || 0,
        requests: current.requests || 0,
        estimatedCostYen,
      },
      balance: balSnap.val() ?? null,
      totalUsedAllTime: ownerSnap.val() || 0,
      history,
    });
  } catch (e: any) {
    console.error('Owner AI Usage error:', e);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
