import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import NotFound from "./pages/NotFound";
import { AboutPage, AdminPage, ContactPage, ForgotPasswordPage, HomePage, InboxPage, LoginPage, PlansPage, ResetPasswordPage, SignupPage, UserPage } from "./pages/Screens";

function Router() {
  return <Switch>
    <Route path="/" component={HomePage}/><Route path="/plans" component={PlansPage}/><Route path="/about" component={AboutPage}/><Route path="/contact" component={ContactPage}/>
    <Route path="/signup" component={SignupPage}/><Route path="/login" component={LoginPage}/><Route path="/forgot-password" component={ForgotPasswordPage}/><Route path="/reset-password" component={ResetPasswordPage}/>
    <Route path="/app" component={() => <UserPage section="overview"/>}/><Route path="/app/deposit" component={() => <UserPage section="deposit"/>}/><Route path="/app/invest" component={() => <UserPage section="invest"/>}/><Route path="/app/withdraw" component={() => <UserPage section="withdraw"/>}/><Route path="/app/transactions" component={() => <UserPage section="transactions"/>}/><Route path="/app/inbox" component={() => <UserPage section="inbox"/>}/><Route path="/app/settings" component={() => <UserPage section="settings"/>}/>
    <Route path="/admin" component={() => <AdminPage section="overview"/>}/><Route path="/admin/users" component={() => <AdminPage section="users"/>}/><Route path="/admin/deposits" component={() => <AdminPage section="deposits"/>}/><Route path="/admin/withdrawals" component={() => <AdminPage section="withdrawals"/>}/><Route path="/admin/wallets" component={() => <AdminPage section="wallets"/>}/><Route path="/admin/messages" component={() => <AdminPage section="messages"/>}/><Route path="/admin/activity" component={() => <AdminPage section="activity"/>}/>
    <Route path="/404" component={NotFound}/><Route component={NotFound}/>
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><PreferencesProvider><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></PreferencesProvider></ErrorBoundary>;
}
