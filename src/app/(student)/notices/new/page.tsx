import { NoticeForm } from "@/features/notices/components/notice-form";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewNoticePage() {
  await requireAuth(["ADMIN"]);

  return (
    <div className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-6 border-b border-border/40">
        <Link href="/notices" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">Publish Notice</h2>
          <p className="text-muted-foreground text-sm">Broadcast an announcement or alert to all students.</p>
        </div>
      </div>
      
      <NoticeForm />
    </div>
  );
}
