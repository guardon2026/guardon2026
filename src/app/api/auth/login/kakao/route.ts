export const dynamic = 'force-dynamic'
import { signIn } from "@/lib/auth"

export async function GET() {
  await signIn("kakao", { redirectTo: "/onboarding" })
}
