import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Leads from "./pages/Leads";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import Directory from "./pages/Directory";
import Tasks from "./pages/Tasks";
import Warehouses from "./pages/Warehouses";
import Delivery from "./pages/Delivery";
import Payments from "./pages/Payments";
import Documents from "./pages/Documents";
import Employees from "./pages/Employees";
import Returns from "./pages/Returns";
import Analytics from "./pages/Analytics";
import AnalyticsRegions from "./pages/AnalyticsRegions";
import Automation from "./pages/Automation";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, role } = useAuthStore();
  const managerHome = "/dashboard/manager";
  const directorHome = "/dashboard/director";
  const homePath = role === "director" ? directorHome : managerHome;
  const protect = (element: JSX.Element) =>
    isAuthenticated ? element : <Navigate to="/login" replace />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to={homePath} replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />}
            />
            <Route path="/dashboard/manager" element={protect(<Dashboard scope="manager" />)} />
            <Route path="/dashboard/director" element={protect(<Dashboard scope="director" />)} />
            <Route path="/tasks" element={protect(<Tasks />)} />
            <Route path="/clients" element={protect(<Clients />)} />
            <Route path="/leads" element={protect(<Leads />)} />
            <Route path="/orders" element={protect(<Orders />)} />
            <Route path="/products" element={protect(<Products />)} />
            <Route path="/directory" element={protect(<Directory />)} />
            <Route path="/warehouses" element={protect(<Warehouses />)} />
            <Route path="/delivery" element={protect(<Delivery />)} />
            <Route path="/payments" element={protect(<Payments />)} />
            <Route path="/documents" element={protect(<Documents />)} />
            <Route path="/employees" element={protect(<Employees />)} />
            <Route path="/returns" element={protect(<Returns />)} />
            <Route path="/analytics" element={protect(<Analytics />)} />
            <Route path="/analytics/regions" element={protect(<AnalyticsRegions />)} />
            <Route path="/automation" element={protect(<Automation />)} />
            <Route path="/integrations" element={protect(<Integrations />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
