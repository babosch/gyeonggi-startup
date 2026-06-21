// 기본 금칙어 목록 (초등 수업 환경 기준)
const BAD_WORDS = [
  '개새끼', '시발', '씨발', '씨팔', '시팔', '존나', '존니', '졸라', '좆', '자지', '보지',
  '느금마', '니애미', '병신', '미친', '미쳤', '지랄', '제기랄', '멍청이', '바보새끼', '돼지새끼',
  '쓰레기새끼', '꺼져', '닥쳐', '뒤져', '죽어', '죽여', '살인', '자살', '성폭행',
  '섹스', '섹', '성관계', '야동', '포르노', '야한',
]

export function containsBadWord(word: string): boolean {
  const lower = word.toLowerCase().replace(/\s/g, '')
  return BAD_WORDS.some(bad => lower.includes(bad))
}
