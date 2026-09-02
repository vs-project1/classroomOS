import { NoticeForm } from "@/features/notices/components/notice-form";

export const dynamic = "force-dynamic";

export default function NewNoticePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Publish Notice</h2>
      </div>
      
      <NoticeForm />
    </div>
  );
}
