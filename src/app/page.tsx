import Link from "next/link"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4 bg-gray-50">
      <h1 className="text-3xl font-semibold leading-tight text-blue-600">GuardOn</h1>
      <p className="text-sm text-gray-600">경비·보안 인력 긴급 매칭 플랫폼</p>
      <div className="flex gap-3 mt-4">
        {/* Auth flow will redirect to role-specific landing after login (Phase 2) */}
        <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900 font-semibold">업체로 시작</Link>
        <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900 font-semibold">인력으로 시작</Link>
        {/* Admin link removed from public home — accessible only after authenticated login */}
      </div>
    </main>
  )
}
