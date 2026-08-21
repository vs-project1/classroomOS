import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function CRDashboard() {
  const user = await requireAuth(["CR", "ADMIN"]);
  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">CR Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome back, {user.email}</p>
      </div>

      <div className="grid gap-4">
        <div className="p-4 border rounded-xl bg-card shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold">Today's Sessions</h2>
            <p className="text-sm text-muted-foreground">Log attendance and topics for completed classes.</p>
          </div>
          
          <Link href="/cr/log-session" className={buttonVariants({ variant: "default", className: "w-full" })}>
            Log a Session
          </Link>
        </div>
      </div>
    </div>
  );
}
