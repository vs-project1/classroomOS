"use client";

import { useActionState, useState, useEffect } from "react";
import {
  addCourseMaterial,
  type ActionState,
} from "@/features/subjects/actions/syllabus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadDropzone } from "@/utils/uploadthing";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const initialState: ActionState = { success: false };

export interface AddMaterialDialogProps {
  chapterId: string;
  subjectId: string;
  chapterTitle?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddMaterialDialog({
  chapterId,
  subjectId,
  chapterTitle,
  trigger,
  onSuccess,
}: AddMaterialDialogProps) {
  const [state, action, isPending] = useActionState(
    addCourseMaterial,
    initialState
  );
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || "Material added successfully!");
      setIsOpen(false);
      setFileUrl("");
      setFileType("");
      onSuccess?.();
    } else if (state?.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger ? (
            <span className="inline-flex cursor-pointer">{trigger}</span>
          ) : (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" /> Material
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Material{chapterTitle ? ` — ${chapterTitle}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="chapterId" value={chapterId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="fileUrl" value={fileUrl} />
          <input type="hidden" name="fileType" value={fileType} />

          <div className="flex flex-col gap-2">
            <Label>Material Title</Label>
            <Input name="title" placeholder="e.g. Chapter Slides or Notes" required />
            {state.fieldErrors?.title && (
              <p className="text-destructive text-sm font-medium">
                {state.fieldErrors.title[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <Label>File Upload</Label>
            <UploadDropzone
              endpoint="courseMaterial"
              appearance={{
                container:
                  "border-dashed border-2 border-border rounded-lg bg-muted/30 py-6 outline-none transition-colors hover:border-primary/50",
                button:
                  "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium ut-uploading:bg-primary/50 after:bg-primary",
                label: "text-foreground font-medium text-sm",
                allowedContent: "text-muted-foreground text-xs",
              }}
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  setFileUrl(res[0].url);
                  setFileType(res[0].name.split(".").pop() || "unknown");
                  toast.success("File uploaded successfully");
                }
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
            {fileUrl && (
              <p className="text-sm font-medium text-emerald-500">
                File attached and ready to save!
              </p>
            )}
            {state.fieldErrors?.fileUrl && (
              <p className="text-destructive text-sm font-medium">
                Please upload a file before saving.
              </p>
            )}
          </div>

          {state.message && (
            <p
              className={
                state.success
                  ? "text-emerald-500 text-sm font-medium"
                  : "text-destructive text-sm font-medium"
              }
            >
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending || !fileUrl}>
            {isPending ? "Saving..." : "Save Material"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
