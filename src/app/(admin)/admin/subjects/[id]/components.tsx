"use client";

import { useActionState, useState } from "react";
import { addCourseUnit, addCourseChapter, addCourseMaterial, type ActionState } from "@/features/subjects/actions/syllabus";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadDropzone } from "@/utils/uploadthing";

const initialState: ActionState = { success: false };

export function AddUnitDialog({ subjectId }: { subjectId: string }) {
  const [state, action, isPending] = useActionState(addCourseUnit, initialState);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button />}>
        Add Unit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Course Unit</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="subjectId" value={subjectId} />
          <div className="flex flex-col gap-2">
            <Label>Unit Title</Label>
            <Input name="title" required />
            {state.fieldErrors?.title && <p className="text-destructive text-sm font-medium">{state.fieldErrors.title[0]}</p>}
          </div>
          {state.message && <p className={state.success ? "text-emerald-500 text-sm font-medium" : "text-destructive text-sm font-medium"}>{state.message}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Save Unit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddChapterDialog({ unitId, subjectId }: { unitId: string, subjectId: string }) {
  const [state, action, isPending] = useActionState(addCourseChapter, initialState);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="mt-2" />}>
        Add Chapter
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Chapter</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="unitId" value={unitId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <div className="flex flex-col gap-2">
            <Label>Chapter Title</Label>
            <Input name="title" required />
            {state.fieldErrors?.title && <p className="text-destructive text-sm font-medium">{state.fieldErrors.title[0]}</p>}
          </div>
          {state.message && <p className={state.success ? "text-emerald-500 text-sm font-medium" : "text-destructive text-sm font-medium"}>{state.message}</p>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Save Chapter"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddMaterialDialog({ chapterId, subjectId }: { chapterId: string, subjectId: string }) {
  const [state, action, isPending] = useActionState(addCourseMaterial, initialState);
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        + Material
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="chapterId" value={chapterId} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <input type="hidden" name="fileUrl" value={fileUrl} />
          <input type="hidden" name="fileType" value={fileType} />
          
          <div className="flex flex-col gap-2">
            <Label>Material Title</Label>
            <Input name="title" required />
            {state.fieldErrors?.title && <p className="text-destructive text-sm font-medium">{state.fieldErrors.title[0]}</p>}
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <Label>File Upload</Label>
            <UploadDropzone
              endpoint="courseMaterial"
              appearance={{
                container: "border-dashed border-2 border-border rounded-lg bg-muted/30 py-6 outline-none transition-colors hover:border-primary/50",
                button: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium ut-uploading:bg-primary/50 after:bg-primary",
                label: "text-foreground font-medium text-sm",
                allowedContent: "text-muted-foreground text-xs"
              }}
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  setFileUrl(res[0].url);
                  setFileType(res[0].name.split(".").pop() || "unknown");
                }
              }}
              onUploadError={(error: Error) => {
                alert(`Upload failed: ${error.message}`);
              }}
            />
            {fileUrl && <p className="text-sm font-medium text-emerald-500">File attached and ready to save!</p>}
            {state.fieldErrors?.fileUrl && <p className="text-destructive text-sm font-medium">Please upload a file before saving.</p>}
          </div>
          
          {state.message && <p className={state.success ? "text-emerald-500 text-sm font-medium" : "text-destructive text-sm font-medium"}>{state.message}</p>}
          <Button type="submit" disabled={isPending || !fileUrl}>
            {isPending ? "Saving..." : "Save Material"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
