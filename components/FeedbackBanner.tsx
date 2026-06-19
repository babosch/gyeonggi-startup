// 교사 피드백 표시 배너 (학생 화면). feedback이 있을 때만 보인다.
export default function FeedbackBanner({ feedback }: { feedback: string | null | undefined }) {
  if (!feedback) return null
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-amber-700 mb-1">✍️ 선생님 피드백</div>
      <p className="text-amber-800">{feedback}</p>
    </div>
  )
}
