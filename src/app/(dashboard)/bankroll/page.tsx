import { currentBalance, getOrCreateDefaultAccount, getTransactions, requireUser } from "@/lib/data";
import { formatCurrency } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BalanceChart } from "@/components/bankroll/balance-chart";
import { TransactionForm } from "@/components/bankroll/transaction-form";

export default async function BankrollPage() {
  const { supabase, user } = await requireUser();
  const account = await getOrCreateDefaultAccount(supabase, user.id);
  const transactions = await getTransactions(supabase, account.id);
  const balance = currentBalance(transactions);
  const totalDeposits = transactions.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + t.amount, 0);

  const sortedDesc = [...transactions].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Bankroll</h1>
        <TransactionForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalDeposits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalWithdrawals)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance over time</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceChart transactions={transactions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDesc.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDesc.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.occurred_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === "withdrawal" ? "destructive" : "secondary"}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.note ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {t.type === "withdrawal" ? "-" : ""}
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
