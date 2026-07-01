import { Header } from "@/components/ui/header"

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header role="WORKER" />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
