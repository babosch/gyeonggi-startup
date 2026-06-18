// 마이그레이션 적용 스크립트
// 실행: node scripts/migrate.mjs           → 전체 적용
//       node scripts/migrate.mjs 006       → 006으로 시작하는 파일만 적용
import { readFileSync, readdirSync } from 'fs'
import pg from 'pg'

const env = readFileSync('.env.local', 'utf8')
const conn = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
if (!conn) { console.error('❌ .env.local에 DATABASE_URL 없음'); process.exit(1) }

const filter = process.argv[2] // 예: '006'
const dir = 'supabase/migrations'
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  .filter(f => !filter || f.startsWith(filter))

const client = new pg.Client({ connectionString: conn })
await client.connect()

for (const file of files) {
  const sql = readFileSync(`${dir}/${file}`, 'utf8')
  try {
    await client.query(sql)
    console.log(`✅ ${file}`)
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`)
    await client.end()
    process.exit(1)
  }
}

await client.end()
console.log('완료')
