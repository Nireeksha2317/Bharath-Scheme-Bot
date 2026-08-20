import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const Home = lazy(() => import("@/pages/Home"));
const SchemesList = lazy(() => import("@/pages/SchemesList"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Skeleton className="h-[200px] w-[200px] rounded-full" /></div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/schemes" component={SchemesList} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
