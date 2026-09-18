"use client";

import { deleteSession } from "@/app/(dashboard)/parlays/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteSessionButton({ sessionId, label }: { sessionId: string; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">Delete</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete session?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes “{label}” — its player pool, groups, and any saved parlays. This can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={deleteSession.bind(null, sessionId)}>
            <AlertDialogAction type="submit" variant="destructive">
              Delete
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
