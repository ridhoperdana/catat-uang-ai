import { Switch, Route } from "wouter";
import { queryClient, persister } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineStatusBar } from "@/components/OfflineStatusBar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Expenses from "@/pages/Expenses";
import Recurring from "@/pages/Recurring";
import Invoices from "@/pages/Invoices";
import SettingsPage from "@/pages/Settings";
import AuthPage from "@/pages/AuthPage";

function ProtectedRoute({ component: Component, path }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => <ProtectedRoute component={Home} path="/" />}
      </Route>
      <Route path="/expenses">
        {() => <ProtectedRoute component={Expenses} path="/expenses" />}
      </Route>
      <Route path="/recurring">
        {() => <ProtectedRoute component={Recurring} path="/recurring" />}
      </Route>
      <Route path="/invoices">
        {() => <ProtectedRoute component={Invoices} path="/invoices" />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} path="/settings" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
          <OfflineStatusBar />
        </TooltipProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
