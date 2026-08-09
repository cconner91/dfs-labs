export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">DFS Labs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly lineup strategy, bankroll discipline, ROI you can trust.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
