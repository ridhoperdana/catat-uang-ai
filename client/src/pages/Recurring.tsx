import { Sidebar, MobileNav } from "@/components/Sidebar";
import { useRecurringExpenses, useCreateRecurringExpense, useDeleteRecurringExpense } from "@/hooks/use-recurring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRecurringExpenseSchema, getCurrencyMetadata, CURRENCIES } from "@shared/schema";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { formatAmount } from "@/lib/utils";
import { Plus, CalendarClock, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = insertRecurringExpenseSchema.extend({
  amount: z.coerce.number().min(1),
  nextDueDate: z.coerce.date(),
  currency: z.string().default("USD"),
});

type FormData = z.infer<typeof formSchema>;

export default function Recurring() {
  const { data: recurring, isLoading } = useRecurringExpenses();
  const deleteMutation = useDeleteRecurringExpense();
  const createMutation = useCreateRecurringExpense();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const { data: settings } = useQuery<any>({
    queryKey: [api.settings.get.path],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nextDueDate: new Date(),
      active: true,
      frequency: "monthly",
      currency: settings?.baseCurrency || "USD",
    }
  });

  useEffect(() => {
    if (settings?.baseCurrency) {
      form.setValue("currency", settings.baseCurrency);
    }
  }, [settings, open, form]);

  const onSubmit = (data: FormData) => {
    const metadata = getCurrencyMetadata(data.currency);
    const scale = Math.pow(10, metadata.decimals);

    const submissionData = {
      ...data,
      amount: Math.round(data.amount * scale),
    };
    createMutation.mutate(submissionData, {
      onSuccess: () => {
        toast({ title: "Success", description: "Recurring expense added" });
        setOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 lg:pb-8">
        <header className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Recurring</h1>
            <p className="text-muted-foreground text-sm">Manage subscriptions and regular bills.</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-primary/25">
                <Plus className="w-5 h-5 mr-2" /> Add Recurring
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add Recurring Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input {...form.register("description")} className="rounded-xl" placeholder="Netflix, Rent..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all h-10">
                      <span className="pl-3 text-muted-foreground select-none">
                        {getCurrencyMetadata(form.watch("currency") || "USD").symbol}
                      </span>
                      <Input 
                        {...form.register("amount")} 
                        type="number" 
                        step={getCurrencyMetadata(form.watch("currency") || "USD").decimals === 0 ? "1" : "0.01"} 
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-2" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select 
                      value={form.watch("currency")}
                      onValueChange={(val) => form.setValue("currency", val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select onValueChange={(val) => form.setValue("frequency", val)} defaultValue="monthly">
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input {...form.register("category")} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Due Date</Label>
                    <Input {...form.register("nextDueDate", { valueAsDate: true })} type="date" className="rounded-xl" />
                  </div>
                </div>

                <Button type="submit" className="w-full rounded-xl" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="animate-spin" /> : "Save"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          
          {recurring?.map(item => (
            <div key={item.id} className="bg-card border border-border/50 rounded-2xl p-6 relative group hover:shadow-lg transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <h3 className="font-bold text-lg">{item.description}</h3>
              <p className="text-3xl font-display font-bold mt-2">
                {formatAmount(item.amount, item.currency)}
              </p>
              
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-sm text-muted-foreground">
                <span className="capitalize">{item.frequency}</span>
                <span>Due: {format(new Date(item.nextDueDate), "MMM d, yyyy")}</span>
              </div>
            </div>
          ))}

          {!isLoading && recurring?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl">
              <p className="text-muted-foreground">No recurring expenses setup yet.</p>
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
