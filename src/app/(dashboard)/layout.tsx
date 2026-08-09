import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated requests, but guard here too
  // in case this layout is ever rendered outside that matcher.
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1">
      <Sidebar email={user.email} />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
