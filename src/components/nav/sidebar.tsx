"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/app/(auth)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/entries", label: "Entries" },
  { href: "/player-pools", label: "Player Pools" },
  { href: "/bankroll", label: "Bankroll" },
  { href: "/strategy", label: "Strategy" },
  { href: "/analysis", label: "Analysis" },
  { href: "/trends", label: "Trends" },
  { href: "/goals", label: "Goals" },
];

// Kept visually separate — a different bet type/bankroll entirely, not part of DFS tracking.
const OTHER_TOOLS_NAV_ITEMS = [{ href: "/parlays", label: "TD Parlay Optimizer" }];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  function linkClass(href: string) {
    const active = pathname.startsWith(href);
    return cn(
      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );
  }

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)} onClick={onNavigate}>
          {item.label}
        </Link>
      ))}
      <Separator className="my-3" />
      {OTHER_TOOLS_NAV_ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)} onClick={onNavigate}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="border-b px-4 py-5">
      <p className="text-lg font-semibold tracking-tight">
        DFS <span className="text-primary">Labs</span>
      </p>
      <p className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
        Data. Decisions. Edge.
      </p>
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm" className="w-full">
        Sign out
      </Button>
    </form>
  );
}

/** Desktop sidebar — hidden below md, where MobileNav (in the dashboard layout) takes over. */
export function Sidebar({ email }: { email: string | undefined }) {
  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col border-r bg-muted/20 md:flex">
      <Brand />
      <NavLinks />
      <div className="border-t p-3">
        {email && <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{email}</p>}
        <SignOutButton />
      </div>
    </aside>
  );
}

export { NavLinks, Brand, SignOutButton };
