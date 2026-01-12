import { Sidebar, MobileNav } from "@/components/Sidebar";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useExpenses } from "@/hooks/use-expenses";
import { format } from "date-fns";

export default function Expenses() {
  const { data: expenses } = useExpenses();

  const handleExport = () => {
    if (!expenses) return;
    
    // Simple CSV export
    const headers = ["Date", "Description", "Category", "Type", "Amount (USD)"];
    const rows = expenses.map(e => [
      format(new Date(e.date), "yyyy-MM-dd"),
      `"${e.description}"`,
      e.category,
      e.type,
      (e.amount / 100).toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 lg:pb-8">
        <header className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Expenses</h1>
            <p className="text-muted-foreground text-sm">Review your transaction history.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="hidden sm:flex rounded-xl" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <ExpenseForm />
          </div>
        </header>

        <div className="p-6 max-w-5xl mx-auto">
          <ExpenseList />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
