import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "IDR", label: "Indonesian Rupiah (Rp)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
];

export default function Settings() {
  const { toast } = useToast();
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();

  const handleCurrencyChange = (value: string) => {
    updateSettings({ baseCurrency: value }, {
      onSuccess: () => {
        toast({
          title: "Settings updated",
          description: "Your base currency has been changed.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 pb-24 lg:pb-8">
        <header className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your application preferences.</p>
          </div>
        </header>
        
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Base Currency</CardTitle>
              <CardDescription>
                Select the currency used to display your totals and charts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={settings?.baseCurrency || "USD"}
                  onValueChange={handleCurrencyChange}
                  disabled={isLoading || isUpdating}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isUpdating && (
                  <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Multi-Currency</CardTitle>
              <CardDescription>
                When you add an expense in a different currency, it will be automatically converted to your base currency using real-time exchange rates.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
