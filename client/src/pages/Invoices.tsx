import { Sidebar, MobileNav } from "@/components/Sidebar";
import { useInvoices, useUploadInvoice, useProcessInvoice } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { clsx } from "clsx";
import { format } from "date-fns";

export default function Invoices() {
  const { data: invoices, isLoading } = useInvoices();
  const uploadMutation = useUploadInvoice();
  const processMutation = useProcessInvoice();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      
      uploadMutation.mutate(formData, {
        onSuccess: () => {
          toast({ title: "Upload complete", description: "Invoice uploaded successfully." });
        },
        onError: () => {
          toast({ title: "Upload failed", variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-24 lg:pb-8">
        <header className="px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Invoices</h1>
            <p className="text-muted-foreground text-sm">Upload invoices for AI extraction.</p>
          </div>
          
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploadMutation.isPending}
            className="rounded-xl shadow-lg shadow-primary/25"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Upload className="w-5 h-5 mr-2" />
            )}
            Upload Invoice
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileChange}
          />
        </header>

        <div className="p-6 max-w-5xl mx-auto space-y-6">
          {/* Hero upload area if empty */}
          {!isLoading && invoices?.length === 0 && (
            <div 
              className="border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Drop your invoice here</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Our AI will scan your invoice and automatically add it to your expenses.
              </p>
              <Button variant="outline" className="rounded-xl">Select File</Button>
            </div>
          )}

          {/* List of invoices */}
          <div className="grid gap-4">
            {invoices?.map((invoice) => (
              <div key={invoice.id} className="bg-card border border-border/50 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium truncate max-w-[200px] sm:max-w-md">
                      Invoice #{invoice.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.createdAt && format(new Date(invoice.createdAt), "MMM d, yyyy • h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border",
                    invoice.status === 'processed' && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30",
                    invoice.status === 'pending' && "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30",
                    invoice.status === 'failed' && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30",
                  )}>
                    {invoice.status === 'processed' && <CheckCircle className="w-3 h-3" />}
                    {invoice.status === 'pending' && <Clock className="w-3 h-3" />}
                    {invoice.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                    <span className="capitalize">{invoice.status}</span>
                  </div>

                  {invoice.status === 'pending' && (
                    <Button 
                      size="sm" 
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={processMutation.isPending}
                      onClick={() => processMutation.mutate(invoice.id)}
                    >
                      {processMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" /> Process AI
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
