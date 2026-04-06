import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';

/**
 * API para cadastrar ou atualizar usuários no Firebase Authentication.
 * Permite que administradores criem acessos reais a partir do dashboard.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, ownerId, userId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let firebaseUser;
    
    try {
      // 1. Se tiver userId (UID), usar para atualizar diretamente (permite mudar email)
      if (userId) {
        firebaseUser = await auth.getUser(userId);
        await auth.updateUser(userId, {
          email: email,
          password: password,
          displayName: fullName || email.split('@')[0],
        });
      } else {
        // 2. Tentar encontrar usuário existente por email (fallback/legacy)
        firebaseUser = await auth.getUserByEmail(email);
        
        // Atualizar senha e nome
        await auth.updateUser(firebaseUser.uid, {
          password: password,
          displayName: fullName || email.split('@')[0],
        });
      }
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/user-not-found') {
        // 3. Criar novo usuário se não existir
        firebaseUser = await auth.createUser({
          email,
          password,
          displayName: fullName || email.split('@')[0],
          emailVerified: true
        });
      } else {
        throw e;
      }
    }

    // Retorna sucesso
    return NextResponse.json({ 
      success: true, 
      uid: firebaseUser.uid 
    });

  } catch (error: any) {
    console.error('[AdminAPI] Erro no upsert de usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    try {
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AdminAPI] Erro ao deletar usuário:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
