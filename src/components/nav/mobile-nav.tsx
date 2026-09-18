"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Brand, NavLinks, SignOutButton } from "@/components/nav/sidebar";

/** Hamburger + slide-in drawer, visible only below md — the desktop Sidebar takes over above that. */
export function MobileNav({ email }: { email: string | undefined }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b bg-muted/20 px-4 py-3 md:hidden">
        <p className="text-base font-semibold tracking-tight">
          DFS <span className="text-primary">Labs</span>
        </p>
        <Button variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <MenuIcon className="size-5" />
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="left-0 top-0 h-full w-72 max-w-[80vw] translate-x-0 translate-y-0 rounded-none rounded-r-xl p-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex h-full flex-col">
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="border-t p-3">
              {email && <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{email}</p>}
              <SignOutButton />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
