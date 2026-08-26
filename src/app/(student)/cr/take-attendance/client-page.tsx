"use client";
import { useState, useTransition } from "react";
import { submitDailyAttendanceAction } from "@/app/actions/daily-attendance";
import { Button } from "@/components/ui/button";

export function DailyAttendanceClient({ roster, semester }: { roster: any[], semester: string }) {
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late" | "excused">>(
    roster.reduce((acc, s) => ({ ...acc, [s.id]: "present" }), {})
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId,
        status
      }));
      const res = await submitDailyAttendanceAction(semester, new Date(), records);
      setMessage({ type: res.success ? "success" : "error", text: res.message });
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
          {message.text}
        </div>
      )}
      <div className="bg-white rounded-xl border p-4 space-y-4">
        {roster.map(student => (
          <div key={student.id} className="flex justify-between items-center py-2 border-b last:border-0">
            <div>
              <p className="font-semibold">{student.name}</p>
              <p className="text-sm text-gray-500">Roll: {student.rollNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAttendance(prev => ({...prev, [student.id]: 'present'}))}
              >
                Present
              </Button>
              <Button 
                variant={attendance[student.id] === 'absent' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setAttendance(prev => ({...prev, [student.id]: 'absent'}))}
              >
                Absent
              </Button>
              <Button 
                variant={attendance[student.id] === 'late' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setAttendance(prev => ({...prev, [student.id]: 'late'}))}
              >
                Late
              </Button>
            </div>
          </div>
        ))}
        <div className="pt-4 flex justify-end">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Roll Call"}
          </Button>
        </div>
      </div>
    </div>
  );
}
