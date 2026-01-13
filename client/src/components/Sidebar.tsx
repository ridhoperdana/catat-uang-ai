import { Link, useLocation } from "wouter";
import { LayoutDashboard, Receipt, Repeat, FileText, Settings } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden lg:flex flex-col w-64 border-r border-border min-h-screen bg-card sticky top-0 h-screen">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
            D
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Daily<span className="text-primary">Exp</span></span>
        </div>

        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className={clsx(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-8 border-t border-border/50">
        <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-4 rounded-2xl border border-primary/10">
          <h4 className="font-semibold text-sm mb-1 text-foreground">Pro Tip</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Upload invoices to automatically track expenses with AI.
          </p>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();
  
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50 px-4 py-2 flex justify-between shadow-xl shadow-black/5">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} className={clsx(
            "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
            isActive ? "text-primary" : "text-muted-foreground"
          )}>
            <item.icon className={clsx("w-6 h-6", isActive && "fill-primary/20")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
