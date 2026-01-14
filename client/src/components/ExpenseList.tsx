import { useExpenses, useDeleteExpense } from "@/hooks/use-expenses";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown, MoreVertical, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";
import { useSettings } from "@/hooks/use-settings";
import { api } from "@shared/routes";
import { formatAmount } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ExpenseList({ limit }: { limit?: number }) {
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const { settings, isLoading: settingsLoading } = useSettings();

  if (expensesLoading || settingsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const baseCurrency = settings?.baseCurrency || "USD";
  const displayExpenses = limit ? expenses?.slice(0, limit) : expenses;

  if (!displayExpenses?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/5">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <TrendingUp className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">No transactions yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          Start tracking your finances by adding your first income or expense.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayExpenses.map((expense) => {
        const isIncome = expense.type === "income";
        const hasExchangeRate = expense.currency && expense.currency !== baseCurrency;
        
        return (
          <div 
            key={expense.id}
            className="group flex items-center justify-between p-4 bg-card hover:bg-muted/30 border border-border/50 rounded-xl transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center border",
                isIncome 
                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                  : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
              )}>
                {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              
              <div>
                <p className="font-semibold text-foreground">{expense.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                    {expense.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(expense.date), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className={clsx(
                  "font-bold font-mono",
                  isIncome ? "text-green-600 dark:text-green-400" : "text-foreground",
                  expense.isPending && "opacity-50"
                )}>
                  {isIncome ? "+" : "-"}{formatAmount(expense.amount, baseCurrency)}
                </span>
                {expense.isPending ? (
                  <span className="text-[10px] text-primary animate-pulse font-medium">Syncing...</span>
                ) : hasExchangeRate ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-help">
                          <Globe className="w-3 h-3" />
                          Org: {formatAmount(expense.originalAmount || expense.amount, expense.currency)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Converted from {expense.currency} at rate {expense.exchangeRate}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={expense.isPending}>
                  <Button variant="ghost" size="icon" className={clsx(
                    "h-8 w-8 rounded-full transition-opacity",
                    expense.isPending ? "opacity-30" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteExpense.mutate(expense.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
