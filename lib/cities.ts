// 경기도 5개 도시 정보 (도시 탐구·교류용)
// 앱이 정답을 알려주지 않도록 힌트는 최소화 — 위치 찾기용 좌표만 제공
export interface CityInfo {
  code: string
  name: string
  color: string
  // 약식 지도 배치용 좌표 (0~100 grid, 경기도 대략 위치)
  x: number
  y: number
}

export const CITIES: CityInfo[] = [
  { code: 'PAJU',    name: '파주시', color: 'green',  x: 30, y: 12 },
  { code: 'GOYANG',  name: '고양시', color: 'pink',   x: 38, y: 28 },
  { code: 'BUCHEON', name: '부천시', color: 'purple', x: 28, y: 48 },
  { code: 'SUWON',   name: '수원시', color: 'amber',  x: 48, y: 62 },
  { code: 'ICHEON',  name: '이천시', color: 'blue',   x: 72, y: 66 },
]
