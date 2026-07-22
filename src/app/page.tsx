import { getCurrentRole } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import StudentDashboard from "./student-dashboard";

export default async function Dashboard() {
  const CURRENT_ROLE = await getCurrentRole();
  if (CURRENT_ROLE === "STUDENT") {
    return <StudentDashboard />;
  }
  
  return <AdminDashboard />;
}
