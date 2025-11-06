import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Nếu truy cập vào trang chủ, redirect sang /login
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

// Cấu hình matcher để middleware chỉ chạy ở trang chủ
export const config = {
  matcher: '/',
}