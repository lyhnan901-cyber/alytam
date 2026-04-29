import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import Requests from "@/pages/Requests";
import RequestDetails from "@/pages/RequestDetails";
import Tasks from "@/pages/Tasks";
import TasksBoard from "@/pages/TasksBoard";
import TasksCalendar from "@/pages/TasksCalendar";
import TaskDetails from "@/pages/TaskDetails";
import Users from "@/pages/Users";
import Departments from "@/pages/Departments";
import Roles from "@/pages/Roles";
import Settings from "@/pages/Settings";
import CustomFields from "@/pages/CustomFields";
import Automations from "@/pages/Automations";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import Docs from "@/pages/Docs";
import DocDetails from "@/pages/DocDetails";
import DocEdit from "@/pages/DocEdit";
import DocNew from "@/pages/DocNew";
import TimeReports from "@/pages/TimeReports";
import Leads from "@/pages/Leads";
import LeadDetails from "@/pages/LeadDetails";
import MarketingDashboard from "@/pages/MarketingDashboard";
import DepartmentReports from "@/pages/DepartmentReports";
import MyReport from "@/pages/MyReport";
import GMReport from "@/pages/GMReport";
import ComprehensiveReport from "@/pages/ComprehensiveReport";
import Announcements from "@/pages/Announcements";
import ActivityLog from "@/pages/ActivityLog";
import EmployeeTasksReport from "@/pages/EmployeeTasksReport";
 import Permissions from "@/pages/Permissions";
import Donations from "@/pages/Donations";
import Inventory from "@/pages/Inventory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/requests/:id" element={<RequestDetails />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/tasks/board" element={<TasksBoard />} />
              <Route path="/tasks/calendar" element={<TasksCalendar />} />
              <Route path="/tasks/:id" element={<TaskDetails />} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/departments"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <Departments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roles"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <Roles />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/settings/custom-fields"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <CustomFields />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/automations"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <Automations />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-report" element={<MyReport />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/new" element={<DocNew />} />
              <Route path="/docs/:id" element={<DocDetails />} />
              <Route path="/docs/:id/edit" element={<DocEdit />} />
              <Route
                path="/reports/time"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor", "DepartmentHead"]}>
                    <TimeReports />
                  </ProtectedRoute>
                }
              />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/:id" element={<LeadDetails />} />
              <Route path="/marketing" element={<MarketingDashboard />} />
              <Route
                path="/reports/departments"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor"]}>
                    <DepartmentReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/gm"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <GMReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports/comprehensive"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager"]}>
                    <ComprehensiveReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager"]}>
                    <Announcements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity-log"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor"]}>
                    <ActivityLog />
                  </ProtectedRoute>
                }
              />
              <Route
                 path="/permissions"
                 element={
                   <ProtectedRoute allowedRoles={["GeneralManager"]}>
                     <Permissions />
                   </ProtectedRoute>
                 }
               />
               <Route
                path="/reports/employees"
                element={
                  <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor", "DepartmentHead"]}>
                    <EmployeeTasksReport />
                  </ProtectedRoute>
                }
              />
               <Route path="/donations" element={<Donations />} />
               <Route path="/inventory" element={<Inventory />} />
               <Route
                 path="/reports/beneficiaries"
                 element={
                   <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor"]}>
                     <DepartmentReports />
                   </ProtectedRoute>
                 }
               />
             </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
