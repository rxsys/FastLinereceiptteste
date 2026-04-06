import { NextRequest, NextResponse } from 'next/server';
import { auth, rtdb } from '@/lib/firebase';

type Provider = 'claude' | 'gemini' | 'openai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(messages: ChatMessage[], apiKey: string, systemPrompt?: string): Promise<string> {
  const body: any = {
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text || '';
}

async function callGemini(messages: ChatMessage[], apiKey: string, systemPrompt?: string): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body: any = { contents };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(messages: ChatMessage[], apiKey: string, systemPrompt?: string): Promise<string> {
  const msgs: any[] = [];
  if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
  msgs.push(...messages.map(m => ({ role: m.role, content: m.content })));

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: 'gpt-4o', messages: msgs, max_tokens: 2048 })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const userSnap = await rtdb.ref(`users/${decoded.uid}`).get();
    if (userSnap.val()?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { message, provider, apiKey, history, systemPrompt } = await req.json() as {
      message: string;
      provider: Provider;
      apiKey: string;
      history: ChatMessage[];
      systemPrompt?: string;
    };

    if (!message || !provider || !apiKey) {
      return NextResponse.json({ error: 'missing params' }, { status: 400 });
    }

    const messages: ChatMessage[] = [...(history || []), { role: 'user', content: message }];

    let reply = '';
    if (provider === 'claude') {
      reply = await callClaude(messages, apiKey, systemPrompt);
    } else if (provider === 'gemini') {
      reply = await callGemini(messages, apiKey, systemPrompt);
    } else if (provider === 'openai') {
      reply = await callOpenAI(messages, apiKey, systemPrompt);
    } else {
      return NextResponse.json({ error: 'unknown provider' }, { status: 400 });
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('Dev AI Chat error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const userSnap = await rtdb.ref(`users/${decoded.uid}`).get();
    if (userSnap.val()?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'missing prompt' }, { status: 400 });

    await rtdb.ref('developer/aiConfig/lineSystemPrompt').set(prompt);
    await rtdb.ref('developer/aiConfig/updatedAt').set(new Date().toISOString());
    await rtdb.ref('developer/aiConfig/updatedBy').set(decoded.uid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const userSnap = await rtdb.ref(`users/${decoded.uid}`).get();
    if (userSnap.val()?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { provider, apiKey } = await req.json();
    if (!provider || !apiKey) return NextResponse.json({ error: 'missing params' }, { status: 400 });

    await rtdb.ref(`developer_keys/${decoded.uid}/${provider}`).set(apiKey);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);

    const userSnap = await rtdb.ref(`users/${decoded.uid}`).get();
    if (userSnap.val()?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const keyProvider = searchParams.get('key');

    if (keyProvider) {
      const keySnap = await rtdb.ref(`developer_keys/${decoded.uid}/${keyProvider}`).get();
      return NextResponse.json({ apiKey: keySnap.val() || '' });
    }

    const snap = await rtdb.ref('developer/aiConfig').get();
    return NextResponse.json(snap.val() || {});
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
