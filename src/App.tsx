import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext"; // <--- Import useAuth
import Index from "./pages/Index";
import MapView from "./pages/MapView";
import DataBrowser from "./pages/DataBrowser";
import DataEntry from "./pages/DataEntry";
import YourData from "./pages/YourData";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import VerifyEmailNotice from "./pages/VerifyEmailNotice";
import Profile from './pages/Profile';
import ProtectedRoute from './components/misc/ProtectedRoute';
import { Skeleton } from "@/components/ui/skeleton"; 


const queryClient = new QueryClient();

// A wrapper component to manage the initial loading state
const RootContent = () => {
  const { isLoading } = useAuth();
  
  // If we are still checking the initial session, render a loading state
  if (isLoading) {
    // You can replace this with a more sophisticated splash screen
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading application data...</p>
        <Skeleton className="h-4 w-[250px]" />
      </div>
    );
  }

  // Once loading is complete, render the router
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmailNotice />} />
        <Route path="*" element={<NotFound />} />

        {/* Protected routes wrapped with ProtectedRoute */}
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <DataBrowser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-entry"
          element={
            <ProtectedRoute>
              <DataEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/your-data"
          element={
            <ProtectedRoute>
              <YourData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

// Main App component now wraps RootContent with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;