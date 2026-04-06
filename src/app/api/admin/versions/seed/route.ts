import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  const versions = [
    {
      version: '1.5.5',
      createdAt: new Date('2026-03-27T10:45:18').toISOString(),
      description: 'システム更新 - ユーザー設定の初期値設定機能およびLINEボットの権限ロジック修正 (v1.5.5)'
    },
    {
      version: '1.5.4',
      createdAt: new Date('2026-03-27T09:05:59').toISOString(),
      description: 'システム自動更新 (Deploy v1.5.4) - 性能改善およびセキュリティパッチの適用'
    },
    {
      version: '1.5.2',
      createdAt: new Date('2026-03-26T23:48:17').toISOString(),
      description: 'システム自動更新 (Deploy v1.5.2) - 性能改善およびセキュリティパッチの適用'
    }
  ];

  const results = [];
  const versionsCol = db.collection('versions');

  for (const v of versions) {
    const docRef = await versionsCol.add(v);
    results.push({ version: v.version, id: docRef.id });
  }

  return NextResponse.json({ success: true, seeded: results });
}
