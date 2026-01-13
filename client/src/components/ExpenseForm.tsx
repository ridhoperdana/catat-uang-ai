import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, type InsertExpense } from "@shared/schema";
import { useCreateExpense } from "@/hooks/use-expenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "IDR", symbol: "Rp" },
  { code: "AUD", symbol: "A$" },
  { code: "CAD", symbol: "C$" },
  { code: "SGD", symbol: "S$" },
];

const formSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  date: z.coerce.date(),
  currency: z.string().default("USD"),
});

type FormData = z.infer<typeof formSchema>;

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      date: new Date(),
      isRecurring: false,
      currency: "USD",
    }
  });

  const onSubmit = (data: FormData) => {
    createExpense.mutate(data as InsertExpense, {
      onSuccess: () => {
        toast({ title: "Expense added", description: "Your transaction has been recorded." });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    });
  };

  const selectedCurrency = form.watch("currency");
  const currencySymbol = CURRENCIES.find(c => c.code === selectedCurrency)?.symbol || "$";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
          <Plus className="w-5 h-5 mr-2" /> Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                defaultValue="expense" 
                onValueChange={(val) => form.setValue("type", val)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                defaultValue="USD" 
                onValueChange={(val) => form.setValue("currency", val)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="USD" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (cents)</Label>
            <div className="flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
              <span className="pl-3 text-muted-foreground select-none">{currencySymbol}</span>
              <Input 
                id="amount" 
                type="number" 
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-10 px-2"
                placeholder="0.00"
                {...form.register("amount")}
              />
            </div>
            {form.formState.errors.amount && (
              <p className="text-destructive text-xs">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description" 
              placeholder="Groceries, Rent, Salary..." 
              className="rounded-xl"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-destructive text-xs">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(val) => form.setValue("category", val)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Housing">Housing</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Salary">Salary</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-destructive text-xs">{form.formState.errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date" 
                className="rounded-xl"
                {...form.register("date", { valueAsDate: true })}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full mt-2 rounded-xl h-11" 
            disabled={createExpense.isPending}
          >
            {createExpense.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Save Transaction"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
