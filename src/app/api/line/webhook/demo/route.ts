import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { getLineClient } from '@/lib/line';
import { extractExpenseDetailsDirect } from '@/ai/direct-extract';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const payload = JSON.parse(body);
  const events = payload.events || [];

  if (events.length === 0) return NextResponse.json({ status: 'ok' });

  // Buscar credenciais do Bot "demo" no pool
  const poolSnap = await rtdb.ref('line_api_pool').get();
  const pool = poolSnap.val() || {};
  const demoBot = Object.values(pool).find((bot: any) => bot.ownerId === 'demo' || bot.id === 'demo') as any;

  if (!demoBot) {
    console.error('[demo-webhook] Bot "demo" não encontrado no pool');
    return new NextResponse('Demo bot not configured', { status: 200 });
  }

  const lineClient = getLineClient(demoBot.lineChannelAccessToken);

  for (const event of events) {
    const { replyToken, source, type, message } = event;
    const userId = source?.userId;
    if (!userId) continue;

    if (type === 'message') {
      const text = message.text?.trim() || "";

      // 1. Vincular código da tela (ex: #7788 ou 7788)
      const codeMatch = text.match(/#?(\d{4,6})/);
      if (codeMatch) {
        const code = codeMatch[1];
        await rtdb.ref(`demo_codes/${code}`).set({
          userId,
          linkedAt: Date.now(),
          status: 'linked'
        });
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `✨ 接続を完了しました！\n次にレシートの写真を送ってください。Landing Pageのデモ画面に結果が表示されます！` }]
        });
        continue;
      }

      // 2. Processar Imagem (Recibo)
      if (message.type === 'image') {
        // Notificar Landing Page que começou o processamento
        const linkedCodeSnap = await rtdb.ref('demo_codes').orderByChild('userId').equalTo(userId).limitToLast(1).get();
        let sessionCode = null;
        linkedCodeSnap.forEach(child => { sessionCode = child.key; });

        if (!sessionCode) {
          await lineClient.replyMessage({
            replyToken,
            messages: [{ type: 'text', text: `⚠️ まずは画面に表示されている4桁のコードを入力してください（例: 7788）` }]
          });
          continue;
        }

        // Marcar como processando no Firebase (para a landing page mostrar loader)
        await rtdb.ref(`demo_sessions/${sessionCode}`).update({ status: 'processing', ts: Date.now() });

        // Enviar feedback imediato no LINE
        await lineClient.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `📄 領収書を受信しました！\nAIが解析してデモ画面に結果を表示します。少々お待ちください...` }]
        });

        // Extrair Dados (Gemini)
        try {
          // Obter imagem do LINE
          const imgRes = await fetch(`https://api-data.line.me/v2/bot/message/${message.id}/content`, {
            headers: { 
              'Authorization': `Bearer ${demoBot.lineChannelAccessToken}`,
              'Accept': 'image/jpeg'
            }
          });
          const buffer = await imgRes.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString('base64');

          const result = await extractExpenseDetailsDirect({
            photoDataUri: `data:image/jpeg;base64,${base64Image}`,
            apiKey: demoBot.googleGenAiApiKey
          });

          // Salvar resultado para a Landing Page ler
          await rtdb.ref(`demo_sessions/${sessionCode}`).set({
            status: 'completed',
            data: result.data,
            imageUrl: `data:image/jpeg;base64,${base64Image}`, // Enviamos base64 curto para o demo ser instantâneo
            ts: Date.now()
          });

          // Opcional: Notificar no LINE que terminou (Embora o resultado apareça na tela)
          // await lineClient.pushMessage({ to: userId, messages: [...] });

        } catch (e: any) {
          await rtdb.ref(`demo_sessions/${sessionCode}`).update({ status: 'error', error: e.message });
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: `❌ 処理中にエラーが発生しました。もう一度試してください。` }] });
        }
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}
