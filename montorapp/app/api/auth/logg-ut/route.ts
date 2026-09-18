import { NextResponse } from 'next/server';
import { cookieValg, SESJON_COOKIE } from '@/lib/auth/session';

export async function POST() {
  const svar = NextResponse.json({ ok: true });
  svar.cookies.set(SESJON_COOKIE, '', { ...cookieValg, maxAge: 0 });
  return svar;
}
