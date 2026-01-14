import { useExpenseStats } from "@/hooks/use-expenses";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";
import { useSettings } from "@/hooks/use-settings";
import { api } from "@shared/routes";
import { formatAmount } from "@/lib/utils";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  trend?: string; 
  className?: string 
}) {
  return (
    <div className={clsx(
      "bg-card rounded-2xl p-6 shadow-sm border border-border/50 relative overflow-hidden group hover:shadow-md transition-all duration-300", 
      className
    )}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
      </div>
      
      <div className="relative z-10">
        <p className="text-3xl font-display font-bold tracking-tight">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
    </div>
  );
}

export function StatsCards() {
  const { data: stats, isLoading: statsLoading } = useExpenseStats() as any;
  const { settings, isLoading: settingsLoading } = useSettings();

  if (statsLoading || settingsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  const baseCurrency = settings?.baseCurrency || "USD";
  const format = (val: number) => formatAmount(val, baseCurrency);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <StatCard 
        title="Total Balance" 
        value={format(stats?.balance || 0)} 
        icon={Wallet}
        className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
      />
      <StatCard 
        title="Income" 
        value={format(stats?.totalIncome || 0)} 
        icon={ArrowUpRight}
        className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 [&_svg]:text-green-600"
      />
      <StatCard 
        title="Expenses" 
        value={format(stats?.totalExpense || 0)} 
        icon={ArrowDownRight}
        className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 [&_svg]:text-red-600"
      />
      <StatCard 
        title="Monthly Flow" 
        value={format(stats?.monthlyIncome || 0)} 
        icon={TrendingUp}
        trend="Income this month"
      />
    </div>
  );
}
