import Link from "next/link"
import { ShieldX } from "lucide-react"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm text-center space-y-6 px-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-sm text-gray-500">현재 계정으로는 이 페이지에 접근할 수 없습니다.</p>
        </div>
        <div className="space-y-2">
          <Link
            href="/"
            className="block w-full py-2.5 px-4 bg-brand text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            홈으로 이동
          </Link>
          <Link
            href="/dev-login"
            className="block w-full py-2.5 px-4 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            다른 계정으로 로그인
          </Link>
        </div>
      </div>
    </div>
  )
}
