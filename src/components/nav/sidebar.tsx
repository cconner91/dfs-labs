"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/entries", label: "Entries" },
  { href: "/bankroll", label: "Bankroll" },
  { href: "/strategy", label: "Strategy" },
  { href: "/analysis", label: "Analysis" },
  { href: "/trends", label: "Trends" },
  { href: "/goals", label: "Goals" },
];

export function Sidebar({ email }: { email: string | undefined }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-muted/20">
      <div className="border-b px-4 py-5">
        <p className="text-lg font-semibold tracking-tight">DFS Labs</p>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        {email && <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{email}</p>}
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
