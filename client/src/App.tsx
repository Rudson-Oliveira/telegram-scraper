import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Channels from "./pages/Channels";
import Messages from "./pages/Messages";
import History from "./pages/History";
import Export from "./pages/Export";
import Scraping from "./pages/Scraping";
import Search from "./pages/Search";
import Worker from "./pages/Worker";
import ApiKeys from "./pages/ApiKeys";
import MediaGenerator from "./pages/MediaGenerator";
import Workflows from "./pages/Workflows";
import Funnel from "./pages/Funnel";
import TelegramAuth from "./pages/TelegramAuth";
import HospitalDashboard from "./pages/HospitalDashboard";
import Integrations from "./pages/Integrations";
import ScrapingHistory from "./pages/ScrapingHistory";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings} />
      <Route path="/channels" component={Channels} />
      <Route path="/messages" component={Messages} />
      <Route path="/history" component={History} />
      <Route path="/export" component={Export} />
      <Route path="/scraping" component={Scraping} />
      <Route path="/search" component={Search} />
      <Route path="/worker" component={Worker} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/media" component={MediaGenerator} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/funnel" component={Funnel} />
      <Route path="/telegram-auth" component={TelegramAuth} />
      <Route path="/hospital" component={HospitalDashboard} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/scraping-history" component={ScrapingHistory} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
