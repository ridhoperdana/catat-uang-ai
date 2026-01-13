import { Switch, Route } from "wouter";
import { queryClient, persister } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineStatusBar } from "@/components/OfflineStatusBar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Expenses from "@/pages/Expenses";
import Recurring from "@/pages/Recurring";
import Invoices from "@/pages/Invoices";
import SettingsPage from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/recurring" component={Recurring} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/settings" component={SettingsPage} />
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
      <TooltipProvider>
        <Router />
        <Toaster />
        <OfflineStatusBar />
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
