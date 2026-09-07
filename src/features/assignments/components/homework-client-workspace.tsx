"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleHomeworkCompletionAction } from "@/features/assignments/actions/assignments";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Book,
  Clock,
  CheckCircle2,
  PenTool,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatNepaliDateTime } from "@/lib/nepali-date";

interface SubmissionInfo {
  id: string;
  status: string;
  content?: string | null;
  submittedAt?: Date | string | null;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  assignedDate: Date | string;
  dueDate: Date | string;
  status: string;
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
  const [activeTab, setActiveTab] = useState("active");
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const hw of allHomework) {
      const hasSubmission = (hw.submissions && hw.submissions.length > 0) || hw.status === "completed";
      if (hasSubmission) {
        initial[hw.id] = true;
      }
    }
    return initial;
  });

  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const now = new Date();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const handleToggle = (homeworkId: string) => {
    const previousState = !!completedMap[homeworkId];
    const nextState = !previousState;

    // Optimistic update
    setCompletedMap((prev) => ({ ...prev, [homeworkId]: nextState }));
    setLoadingId(homeworkId);

    startTransition(async () => {
      try {
        const res = await toggleHomeworkCompletionAction(homeworkId);
        if (res.success) {
          toast.success(res.message ?? (nextState ? "Marked as completed in notebook." : "Marked as pending."));
        } else {
          // Revert
          setCompletedMap((prev) => ({ ...prev, [homeworkId]: previousState }));
          toast.error("Failed to update status. Please try again.");
        }
      } catch (err) {
        setCompletedMap((prev) => ({ ...prev, [homeworkId]: previousState }));
        toast.error("An error occurred while updating homework status.");
      } finally {
        setLoadingId(null);
      }
    });
  };

  // Classify Homework based on handwritten status
  const activeList: HomeworkItem[] = [];
  const dueSoonList: HomeworkItem[] = [];
  const overdueList: HomeworkItem[] = [];
  const completedList: HomeworkItem[] = [];

  for (const hw of allHomework) {
    const isCompleted = !!completedMap[hw.id];
    const dueDate = new Date(hw.dueDate);
    const isDueSoon = !isCompleted && dueDate.getTime() >= now.getTime() && dueDate.getTime() <= now.getTime() + fortyEightHoursMs;
    const isOverdue = !isCompleted && dueDate.getTime() < now.getTime();

    if (isCompleted) {
      completedList.push(hw);
    } else {
      activeList.push(hw);
      if (isDueSoon) dueSoonList.push(hw);
      if (isOverdue) overdueList.push(hw);
    }
  }

  const renderCard = (hw: HomeworkItem) => {
    const isCompleted = !!completedMap[hw.id];
    const dueDate = new Date(hw.dueDate);
    const isDueSoon = !isCompleted && dueDate.getTime() >= now.getTime() && dueDate.getTime() <= now.getTime() + fortyEightHoursMs;
    const isOverdue = !isCompleted && dueDate.getTime() < now.getTime();
    const dueDateFormatted = formatNepaliDateTime(dueDate);
    const isThisLoading = loadingId === hw.id;

    return (
      <div
        key={hw.id}
        id={`assignment-${hw.id}`}
        data-testid="assignment-card"
        className={`flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md text-card-foreground ${
          isCompleted ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-border/60"
        }`}
      >
        <div>
          {/* Header Badges */}
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary font-mono border border-primary/20">
              {hw.subject.code}
            </span>

            {/* Status Badges */}
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Done in Notebook
              </span>
            ) : isOverdue ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                Overdue
              </span>
            ) : isDueSoon ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Due Soon
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                To Do
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-foreground leading-snug mb-1">
            {hw.title}
          </h3>
          <p className="text-xs text-muted-foreground font-medium mb-3">
            {hw.subject.name}
          </p>

          {hw.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed bg-muted/30 p-2.5 rounded-lg border border-border/20">
              {hw.description}
            </p>
          )}
        </div>

        {/* Footer Meta & Actions */}
        <div className="pt-4 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Due: {dueDateFormatted}
            </span>
            <Link
              href={`/homework/${hw.id}`}
              className={buttonVariants({ variant: "ghost", size: "xs" })}
            >
              Details <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isCompleted ? "outline" : "default"}
              disabled={isPending && isThisLoading}
              onClick={() => handleToggle(hw.id)}
              className={`w-full gap-1.5 font-semibold text-xs cursor-pointer ${
                isCompleted
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  : ""
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Completed in Notebook (Undo)
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5" />
                  Mark as Done in Notebook
                </>
              )}
            </Button>
          </div>
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
              Homework & Assignments
            </h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Track questions and deliverables assigned by your teachers. Complete them by hand in your physical notebooks and keep your study diary organized.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary font-medium">
          <Sparkles className="w-4 h-4" />
          <span>Handwritten Study Tracker</span>
        </div>
      </div>

      {/* 4 Filter Tabs */}
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="active" className="py-2.5 font-semibold text-xs cursor-pointer">
            To Do ({activeList.length})
          </TabsTrigger>
          <TabsTrigger value="dueSoon" className="py-2.5 font-semibold text-xs cursor-pointer">
            Due Soon ({dueSoonList.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="py-2.5 font-semibold text-xs cursor-pointer">
            Overdue ({overdueList.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="py-2.5 font-semibold text-xs cursor-pointer">
            Done in Notebook ({completedList.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Active / To Do Tab */}
        <TabsContent value="active" className="space-y-4">
          {activeList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No pending homework! All assigned coursework is marked as done in your notebook.
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
              No homework due within the next 48 hours.
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
              No overdue homework. Great job staying on schedule!
            </div>
          )}
        </TabsContent>

        {/* 4. Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          {completedList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedList.map((hw) => renderCard(hw))}
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground rounded-xl border border-dashed bg-muted/5">
              No assignments marked as completed yet. Once you write them in your notebook, mark them here.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
