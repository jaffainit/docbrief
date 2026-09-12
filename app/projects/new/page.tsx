import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { NewProjectForm } from "@/components/NewProjectForm";

export default async function NewProjectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/dashboard" className="text-sm text-indigo-700 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">New documentary brief</h1>
      <p className="mt-2 text-slate-600">
        Cost, balance, and after-balance are shown before generate. Free plan = 1 short render.
      </p>
      <div className="mt-6">
        <NewProjectForm credits={user.credits} plan={user.plan} />
      </div>
    </div>
  );
}
