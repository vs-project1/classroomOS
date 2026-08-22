"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveSubmissionDraftAction, submitAssignmentAction, SubmissionActionResult } from "@/features/assignments/actions/assignments";
import { uploadFiles } from "@/utils/uploadthing";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Book,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  UploadCloud,
  FileText,
  Trash2,
  Calendar,
  Layers,
  Send,
  Save,
  Check,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmissionInfo {
  id: string;
  status: string; // 'draft' | 'submitted' | 'graded' | 'late'
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  grade?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt?: Date | string | null;
  gradedAt?: Date | string | null;
  gradedByTeacher?: {
    name: string;
  } | null;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  assignedDate: Date | string;
  dueDate: Date | string;
  status: string; // 'active' | 'completed' | 'archived'
  subject: {
    id: string;
    name: string;
    code: string;
  };
  submissions?: SubmissionInfo[];
}

interface HomeworkClientWorkspaceProps {
  allHomework: HomeworkItem[];
  currentStudentId: string | null;
  currentUserRole: string;
}

export function HomeworkClientWorkspace({
  allHomework,
  currentStudentId,
  currentUserRole,
}: HomeworkClientWorkspaceProps) {
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Form State inside Dialog
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  // Helper to open modal for an assignment
  const openSubmissionModal = (hw: HomeworkItem) => {
    setSelectedHw(hw);
    const existingSub = hw.submissions?.[0];
    setContent(existingSub?.content || "");
    setFileUrl(existingSub?.fileUrl || null);
    setFileName(existingSub?.fileName || null);
    setFileSize(existingSub?.fileSize || null);
    setToastMessage(null);
    setSubmitSuccess(false);
    setModalOpen(true);
  };

  // Classify Homework
  const activeList: HomeworkItem[] = [];
  const dueSoonList: HomeworkItem[] = [];
  const overdueList: HomeworkItem[] = [];
  const submittedList: HomeworkItem[] = [];
  const gradedList: HomeworkItem[] = [];

  for (const hw of allHomework) {
    const sub = hw.submissions?.[0];
    const dueDate = new Date(hw.dueDate);
    const isSubmitted = sub?.status === "submitted" || sub?.status === "late" || (hw.status === "completed" && !sub?.grade);
    const isGraded = sub?.status === "graded" || sub?.score != null || (hw.status === "completed" && sub?.grade);
    const isDueSoon = !isSubmitted && !isGraded && dueDate.getTime() >= now.getTime() && dueDate.getTime() <= now.getTime() + fortyEightHoursMs;
    const isOverdue = !isSubmitted && !isGraded && dueDate.getTime() < now.getTime();

    if (isGraded) {
      gradedList.push(hw);
    } else if (isSubmitted) {
      submittedList.push(hw);
    } else {
      // Pending / Active
      activeList.push(hw);
      if (isDueSoon) dueSoonList.push(hw);
      if (isOverdue) overdueList.push(hw);
    }
  }

  // Handle Real File Upload (uploadthing `assignmentSubmission` route).
  // The previous implementation stored a fabricated utfs.io URL with no
  // validation — files never actually left the browser.
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      setToastMessage({ text: "File exceeds the 16MB limit.", type: "error" });
      setTimeout(() => setToastMessage(null), 4000);
      e.target.value = "";
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setIsUploading(true);
    try {
      const res = await uploadFiles("assignmentSubmission", { files: [file] });
      const uploaded = res[0];
      setFileUrl(uploaded.url ?? (uploaded.key ? `https://utfs.io/f/${uploaded.key}` : null));
      setToastMessage({ text: "File uploaded successfully.", type: "success" });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error("Upload failed:", err);
      setFileName(null);
      setFileSize(null);
      setFileUrl(null);
      setToastMessage({
        text: "Upload failed. Check your connection — only PDF, image, and text/code files up to 16MB are accepted.",
        type: "error",
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveDraft = () => {
    if (!selectedHw) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("homeworkId", selectedHw.id);
      formData.set("content", content);
      if (fileUrl) formData.set("fileUrl", fileUrl);
      if (fileName) formData.set("fileName", fileName);
      if (fileSize) formData.set("fileSize", fileSize.toString());

      const res = await saveSubmissionDraftAction(null, formData);
      if (res.success) {
        setToastMessage({ text: res.message || "Draft saved successfully.", type: "success" });
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setToastMessage({ text: res.message || "Failed to save draft.", type: "error" });
      }
    });
  };

  const handleSubmitWork = () => {
    if (!selectedHw) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("homeworkId", selectedHw.id);
      formData.set("content", content);
      if (fileUrl) formData.set("fileUrl", fileUrl);
      if (fileName) formData.set("fileName", fileName);
      if (fileSize) formData.set("fileSize", fileSize.toString());

      const res = await submitAssignmentAction(null, formData);
      if (res.success) {
        setToastMessage({ text: "Assignment submitted successfully! Status: Submitted", type: "success" });
        setSubmitSuccess(true);
      } else {
        setToastMessage({ text: res.message || "Failed to submit assignment.", type: "error" });
      }
    });
  };

  const handleViewStatus = () => {
    const hwId = selectedHw?.id;
    setModalOpen(false);
    setSubmitSuccess(false);
    setActiveTab("submitted");
    setTimeout(() => {
      document.getElementById(`assignment-${hwId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  const handleSubmitAnother = () => {
    setContent("");
    setFileUrl(null);
    setFileName(null);
    setFileSize(null);
    setToastMessage(null);
    setSubmitSuccess(false);
  };

  // Move focus to the success heading when the form swaps to the success
  // panel, so keyboard and screen-reader users don't lose their place.
  const successHeadingRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (submitSuccess) {
      successHeadingRef.current?.focus();
    }
  }, [submitSuccess]);

  const renderCard = (hw: HomeworkItem, defaultBadge?: string) => {
    const sub = hw.submissions?.[0];
    const dueDate = new Date(hw.dueDate);
    const isDueSoon = dueDate.getTime() >= now.getTime() && dueDate.getTime() <= now.getTime() + fortyEightHoursMs;
    const isOverdue = dueDate.getTime() < now.getTime();
    const isSubmitted = sub?.status === "submitted" || sub?.status === "late";
    const isGraded = sub?.status === "graded" || sub?.score != null;

    const dueDateFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dueDate);

    return (
      <div
        key={hw.id}
        id={`assignment-${hw.id}`}
        data-testid="assignment-card"
        className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all text-card-foreground"
      >
        <div>
          {/* Header Badges */}
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary font-mono border border-primary/20">
              {hw.subject.code}
            </span>

            {/* Status Chips */}
            {isGraded ? (
              <span className="badge px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Graded
              </span>
            ) : isSubmitted ? (
              <span className="badge px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Submitted
              </span>
            ) : isOverdue ? (
              <span className="badge px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                Overdue
              </span>
            ) : isDueSoon ? (
              <span className="badge px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Due Soon
              </span>
            ) : (
              <span className="badge px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                Active
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-foreground leading-snug mb-1">
            {hw.title}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mb-2">
            {hw.subject.name}
          </p>

          {hw.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {hw.description}
            </p>
          )}

          {/* Graded Card Feedback Section */}
          {isGraded && sub && (
            <div
              data-testid="grade-feedback-card"
              className="mt-3 p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-2 mb-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Award className="w-4 h-4" /> Grade & Feedback
                </span>
                <div className="flex items-center gap-2">
                  {sub.score != null && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-xs tabular-nums">
                      Score: {sub.score}/100
                    </span>
                  )}
                  {sub.grade && (
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-xs">
                      Grade: {sub.grade}
                    </span>
                  )}
                </div>
              </div>

              {sub.feedback && (
                <p className="text-xs text-foreground/90 italic bg-card/60 p-2.5 rounded-lg border border-border/30">
                  "{sub.feedback}"
                </p>
              )}

              {sub.gradedByTeacher && (
                <p className="text-xs text-muted-foreground font-medium">
                  Graded by {sub.gradedByTeacher.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta & Button */}
        <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Due: {dueDateFormatted}
          </span>

          <Button
            size="sm"
            variant={isGraded ? "outline" : isSubmitted ? "secondary" : "default"}
            onClick={() => openSubmissionModal(hw)}
            className="cursor-pointer"
          >
            {isGraded ? "View Grade & Feedback" : isSubmitted ? "Edit Submission" : "Submit Assignment"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-8 max-w-6xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Book className="w-6 h-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold font-fira-sans tracking-tight text-foreground">
              Assignments
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Track module coursework, submit lab writeups & code files, save drafts, and view instructor grading remarks.
          </p>
        </div>
      </div>

      {/* Global In-Page Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={cn(
            "p-4 rounded-xl border flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200",
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 5 Filter Tabs */}
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 w-full h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="active" className="py-2.5 font-semibold text-xs cursor-pointer">
            Active ({activeList.length})
          </TabsTrigger>
          <TabsTrigger value="dueSoon" className="py-2.5 font-semibold text-xs cursor-pointer">
            Due Soon ({dueSoonList.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="py-2.5 font-semibold text-xs cursor-pointer">
            Overdue ({overdueList.length})
          </TabsTrigger>
          <TabsTrigger value="submitted" className="py-2.5 font-semibold text-xs cursor-pointer">
            Submitted ({submittedList.length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="py-2.5 font-semibold text-xs cursor-pointer">
            Graded ({gradedList.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Active Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No pending active assignments. All coursework completed!
            </div>
          )}
        </TabsContent>

        {/* 2. Due Soon Tab */}
        <TabsContent value="dueSoon" className="space-y-4">
          {dueSoonList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dueSoonList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No assignments due within the next 48 hours.
            </div>
          )}
        </TabsContent>

        {/* 3. Overdue Tab */}
        <TabsContent value="overdue" className="space-y-4">
          {overdueList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {overdueList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No overdue assignments. Great job staying on schedule!
            </div>
          )}
        </TabsContent>

        {/* 4. Submitted Tab */}
        <TabsContent value="submitted" className="space-y-4">
          {submittedList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {submittedList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No submitted assignments pending grading.
            </div>
          )}
        </TabsContent>

        {/* 5. Graded Tab */}
        <TabsContent value="graded" className="space-y-4">
          {gradedList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {gradedList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No graded assignments yet. Evaluated work will show here.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submission & Draft Modal Dialog */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setSubmitSuccess(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedHw?.title || "Submit Assignment"}
            </DialogTitle>
            <DialogDescription>
              {selectedHw?.subject.name} ({selectedHw?.subject.code}) — Provide your solution text and attach your project files.
            </DialogDescription>
          </DialogHeader>

          {submitSuccess ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center" data-testid="submission-success" role="status">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 shrink-0" />
              <div className="space-y-1">
                <p ref={successHeadingRef} tabIndex={-1} className="text-base font-bold text-foreground outline-none focus:outline-none">
                  Assignment submitted!
                </p>
                <p className="text-xs text-muted-foreground font-medium max-w-xs">
                  Your submission for &ldquo;{selectedHw?.title}&rdquo; has been received and is awaiting grading.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={handleViewStatus} className="gap-1 text-xs cursor-pointer">
                  <FileCheck className="w-3.5 h-3.5" />
                  View Status
                </Button>
                <Button size="sm" variant="default" onClick={handleSubmitAnother} className="gap-1 text-xs cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                  Edit Submission
                </Button>
              </div>
            </div>
          ) : (
          <>
          {toastMessage && (
            <div
              role="alert"
              className={cn(
                "p-3 rounded-lg border text-xs font-medium flex items-center gap-2",
                toastMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              )}
            >
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          )}

          <div className="space-y-4 pt-1">
            {/* Written Text Solution */}
            <div>
              <label htmlFor="content" className="block text-xs font-semibold text-foreground mb-1.5">
                Written Solution / Code Analysis
              </label>
              <textarea
                name="content"
                id="content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your solution analysis or code writeup..."
                className="w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
              />
            </div>

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                File Attachment (PDF, image, or text/code file up to 16MB)
              </label>

              <div
                data-testid="file-upload-dropzone"
                className="relative border-2 border-dashed border-border/60 hover:border-primary/50 rounded-xl p-5 text-center bg-muted/10 transition-colors flex flex-col items-center justify-center cursor-pointer"
              >
                <input
                  type="file"
                  id="file-upload-input"
                  name="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  aria-label="Upload assignment file (PDF, image, or text/code, max 16MB)"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 disabled:cursor-wait"
                />

                <UploadCloud className="w-8 h-8 text-primary mb-2 opacity-80" />
                <p className="text-xs font-semibold text-foreground">
                  {isUploading ? "Uploading…" : "Click or drag files here to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  PDF, image, or code/text file (max 16MB)
                </p>
              </div>

              {/* Uploaded File Chip */}
              {fileName && (
                <div className="mt-2.5 p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{fileName}</span>
                    {fileSize && (
                      <span className="text-muted-foreground text-xs font-medium">
                        ({Math.round(fileSize / 1024)} KB)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setFileUrl(null);
                      setFileSize(null);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleSaveDraft}
                className="gap-1 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={isPending || (!content && !fileName && !fileUrl)}
                onClick={handleSubmitWork}
                className="gap-1 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Assignment
              </Button>
            </div>
          </div>
          </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
