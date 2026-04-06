import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { validateRegistrationNumber } from '@/lib/nta-service';

// Revalida registros NTA com mais de 30 dias ou nunca verificados
// Ignora 'verified' com menos de 30 dias para economizar chamadas à API NTA

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> }
) {
  const { ownerId } = await params;
  if (!ownerId) return NextResponse.json({ error: 'ownerId required' }, { status: 400 });

  const snap = await rtdb.ref(`owner_data/${ownerId}/expenses`).get();
  if (!snap.exists()) return NextResponse.json({ checked: 0, updated: 0, skipped: 0 });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let checked = 0; let updated = 0; let skipped = 0;

  const tasks: Promise<void>[] = [];

  snap.forEach(child => {
    const exp = child.val();
    const expId = child.key!;
    const regNum: string = exp.registrationNumber || exp.tNumber || '';

    if (!regNum) { skipped++; return; }

    // Pular verified recentes (< 30 dias)
    if (exp.ntaStatus === 'verified' && exp.ntaLastCheck && exp.ntaLastCheck > thirtyDaysAgo) {
      skipped++;
      return;
    }

    checked++;
    tasks.push(
      validateRegistrationNumber(regNum).then(async result => {
        await rtdb.ref(`owner_data/${ownerId}/expenses/${expId}`).update({
          ntaStatus: result.status,
          ntaData: result.success ? { name: result.name || '', address: result.address || '' } : null,
          ntaLastCheck: new Date().toISOString(),
        });
        updated++;
      }).catch(() => { /* ignora falhas individuais */ })
    );
  });

  // Processa em lotes de 5 para não sobrecarregar a API NTA
  for (let i = 0; i < tasks.length; i += 5) {
    await Promise.all(tasks.slice(i, i + 5));
  }

  return NextResponse.json({ checked, updated, skipped });
}
