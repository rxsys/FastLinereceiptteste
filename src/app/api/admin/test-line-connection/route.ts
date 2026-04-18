import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { channelAccessToken } = await req.json();

    if (!channelAccessToken) {
      return NextResponse.json({ success: false, error: 'Token não fornecido' }, { status: 400 });
    }

    // Testa a validade do Token buscando as informações do Bot
    const response = await fetch('https://api.line.me/v2/bot/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Erro de autenticação com a API do LINE' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      botInfo: data 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
