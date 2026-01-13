import { Sidebar, MobileNav } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, PieChart } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useExpenses } from "@/hooks/use-expenses";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { format, subDays, startOfMonth, eachDayOfInterval } from "date-fns";

function ChartSection() {
  const { data: expenses } = useExpenses();
  const { data: settings } = useQuery<any>({
    queryKey: [api.settings.get.path],
  });

  const baseCurrency = settings?.baseCurrency || "USD";

  // Simple data processing for chart
  const today = new Date();
  const start = startOfMonth(today);
  const days = eachDayOfInterval({ start, end: today });
  
  const chartData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayExpenses = expenses?.filter(e => 
      format(new Date(e.date), 'yyyy-MM-dd') === dayStr && e.type === 'expense'
    ) || [];
    
    return {
      date: format(day, 'MMM d'),
      amount: dayExpenses.reduce((acc, curr) => acc + (curr.amount / 100), 0)
    };
  });

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <PieChart className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg">Monthly Spending</h3>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
              minTickGap={30}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency, maximumFractionDigits: 0 }).format(val)}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }}
              formatter={(val: number) => [new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency }).format(val), 'Spent']}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 pb-24 lg:pb-8">
        <header className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back, track your daily wealth.</p>
          </div>
          <ExpenseForm />
        </header>
        
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          <StatsCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSection />
            </div>
            
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                <Link href="/expenses">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/5">
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <ExpenseList limit={5} />
            </div>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
