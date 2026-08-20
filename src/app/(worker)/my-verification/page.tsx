import { redirect } from "next/navigation"

export default function MyVerificationRedirect() {
  redirect("/profile?edit=1")
}
