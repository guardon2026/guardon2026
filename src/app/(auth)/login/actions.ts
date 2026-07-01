"use server"
import { signIn } from "@/lib/auth"

export async function kakaoSignIn() {
  await signIn("kakao", { redirectTo: "/onboarding" })
}
