import { NextResponse } from 'next/server';
import { auth, rtdb } from '@/lib/firebase';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    const userSnap = await rtdb.ref(`users/${decodedToken.uid}`).get();
    const userData = userSnap.val();
    if (userData?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Busca o uso global salvo pelos Webhooks
    const usageSnap = await rtdb.ref(`ai_usage_global/${currentMonth}`).get();
    const usageData = usageSnap.val();

    if (!usageData) {
      return NextResponse.json({
        model: "gemini-2.5-flash",
        status: "active",
        quota: { limit: 1500, used: 0, unit: "requests/min" },
        tokens: { input: 0, output: 0, total: 0, estimatedCostYen: 0 },
        lastUpdated: new Date().toISOString()
      });
    }

    // O preço no Google AI Studio (Free tier é 0).
    // No modo Pay-As-You-Go, o Gemini 1.5/2.5 Flash custa em média:
    // $0.075 por 1 Milhão de tokens de input (Até 128k context)
    // $0.30 por 1 Milhão de tokens de output
    // Câmbio base: 1 USD = ~150 JPY
    
    const costInUSD = (usageData.input / 1000000 * 0.075) + (usageData.output / 1000000 * 0.30);
    const estimatedCostYen = Math.round(costInUSD * 150);

    const aiUsage = {
      model: "gemini-2.5-flash",
      status: "active",
      quota: {
        limit: 1500,
        used: usageData.requests, // Mostrar requisições totais do mês no painel
        unit: "requests/month" 
      },
      tokens: {
        input: usageData.input,
        output: usageData.output,
        total: usageData.total,
        estimatedCostYen: estimatedCostYen
      },
      lastUpdated: usageData.lastUpdated
    };

    return NextResponse.json(aiUsage);
  } catch (error: any) {
    console.error("AI Usage Error:", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
