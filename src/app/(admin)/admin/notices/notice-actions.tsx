"use client";

import { useTransition } from "react";
import { deleteNotice, togglePinNotice } from "@/features/notices/actions/notice-actions";
import { Button } from "@/components/ui/button";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { BroadcastNoticeDialog } from "@/features/telegram/components/broadcast-notice-dialog";

export function NoticeActions({
  id,
  isPinned,
  title,
}: {
  id: string;
  isPinned: boolean;
  title?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleTogglePin = () => {
    startTransition(() => {
      togglePinNotice(id, !isPinned);
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this notice?")) {
      startTransition(() => {
        deleteNotice(id);
      });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <BroadcastNoticeDialog noticeId={id} noticeTitle={title || "Campus Notice"} />
      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleTogglePin} disabled={isPending} title={isPinned ? "Unpin" : "Pin"}>
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={handleDelete} disabled={isPending} title="Delete">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
