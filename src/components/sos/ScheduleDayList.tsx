import { Clock, Calendar } from "lucide-react"
import { extractDays, type ScheduleDay } from "@/lib/sos-matcher"

export type { ScheduleDay }

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

interface ScheduleDayListProps {
  scheduleDays: unknown
  scheduledAt: Date
  scheduledEndAt?: Date | null
  /** 이 날짜를 강조 표시 (예: 매치 상세에서 본인이 지원/수락한 날짜) */
  highlightDate?: string
  /** 날짜별 액션 슬롯 (예: 수락/거절/확정 버튼). 없으면 읽기 전용으로 렌더링. */
  renderDayAction?: (day: ScheduleDay) => React.ReactNode
  /** 작은 카드용 컴팩트 스타일 */
  compact?: boolean
}

export function ScheduleDayList({
  scheduleDays,
  scheduledAt,
  scheduledEndAt,
  highlightDate,
  renderDayAction,
  compact = false,
}: ScheduleDayListProps) {
  const days = extractDays(scheduleDays)
  const textSize = compact ? "text-xs" : "text-sm"
  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4"
  const rowPad = compact ? "p-2" : "p-3"

  if (!days) {
    return (
      <div className={`flex items-start gap-2.5 ${rowPad} rounded-xl bg-gray-50`}>
        <Calendar className={`${iconSize} text-gray-400 shrink-0 mt-0.5`} />
        <div>
          <p className={`font-medium text-gray-900 ${textSize}`}>
            {new Date(scheduledAt).toLocaleString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
          {scheduledEndAt && (
            <p className="text-xs text-gray-500 mt-0.5">
              ~ {new Date(scheduledEndAt).toLocaleString("ko-KR", {
                month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {days.map((day, i) => {
        const isHighlighted = highlightDate === day.date
        return (
          <div
            key={i}
            className={`flex items-start gap-3 ${rowPad} rounded-xl ${textSize} ${
              isHighlighted ? "bg-blue-50 border border-brand/30" : "bg-gray-50"
            }`}
          >
            <Clock className={`${iconSize} shrink-0 mt-0.5 ${isHighlighted ? "text-brand" : "text-gray-400"}`} />
            <div className="flex-1">
              <p className={`font-medium ${isHighlighted ? "text-brand" : "text-gray-900"}`}>
                {formatDate(day.date)}
                {day.endDate && day.endDate !== day.date && (
                  <span className="text-gray-500"> → {formatDate(day.endDate)}</span>
                )}
                {isHighlighted && <span className="ml-1.5 text-xs font-semibold">(내 근무일)</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {day.startTime} → {day.endTime}
                {day.requiredCount !== undefined && (
                  <span className="ml-2 text-brand font-medium">{day.requiredCount}명</span>
                )}
              </p>
            </div>
            {renderDayAction && <div className="shrink-0">{renderDayAction(day)}</div>}
          </div>
        )
      })}
    </div>
  )
}
