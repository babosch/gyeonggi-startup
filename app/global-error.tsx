'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: 384, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>잠깐 문제가 생겼어요</p>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>인터넷이 잠깐 끊겼을 수 있어요. 다시 시도해 주세요.</p>
            <button
              onClick={reset}
              style={{ width: '100%', background: '#3b82f6', color: 'white', borderRadius: 16, padding: '16px 0', fontWeight: 700, fontSize: 18, border: 'none' }}
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
