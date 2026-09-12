import { AuthForm } from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <AuthForm mode="signup" />
    </div>
  );
}
