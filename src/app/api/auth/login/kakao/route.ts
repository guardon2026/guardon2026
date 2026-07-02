import { signIn } from "@/lib/auth"

export async function GET() {
  await signIn("kakao", { redirectTo: "/onboarding" })
}
