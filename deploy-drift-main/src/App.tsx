import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import Layout from "./components/Layout";
import Login from "./pages/Login";
// Simplify app to focus on Logs page
import LogsNew from "./pages/LogsNew";
// Remove extra sections to focus on core flow
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      gcTime: 300000,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <React.Suspense fallback={<LoadingSpinner text="Loading application..." />}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/logs" replace />} />
              <Route element={<Layout />}>
                <Route path="/logs" element={<LogsNew />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.Suspense>
  </ErrorBoundary>
);

export default App;
