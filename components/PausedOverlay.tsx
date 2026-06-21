// 교사가 수업을 멈췄을 때 학생 화면을 덮는 흐림 오버레이. 상호작용 차단.
export default function PausedOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(31,41,55,0.35)' }}>
      <div className="bg-white rounded-3xl px-8 py-10 text-center shadow-xl max-w-xs mx-6">
        <div className="text-6xl mb-3">✋</div>
        <p className="text-2xl font-bold text-gray-800">잠깐 멈춰요</p>
        <p className="text-gray-500 mt-2">선생님을 봐 주세요</p>
      </div>
    </div>
  )
}
