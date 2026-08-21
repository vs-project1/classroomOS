import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, ShieldCheck, UserX } from "lucide-react";

export interface KPICardsProps {
  totalAccounts: number;
  activeStudents: number;
  activeTeachers: number;
  crs: number;
  deactivated: number;
}

export function KPISummaryCards({
  totalAccounts,
  activeStudents,
  activeTeachers,
  crs,
  deactivated,
}: KPICardsProps) {
  const cards = [
    {
      title: "Total Accounts",
      value: totalAccounts,
      icon: Users,
      color: "text-foreground",
      bgColor: "bg-muted/50",
      description: "All registered credentials",
    },
    {
      title: "Active Students",
      value: activeStudents,
      icon: GraduationCap,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
      description: "Enrolled active scholars",
    },
    {
      title: "Active Teachers",
      value: activeTeachers,
      icon: BookOpen,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      description: "Teaching faculty",
    },
    {
      title: "Class Reps (CR)",
      value: crs,
      icon: ShieldCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      description: "Student representatives",
    },
    {
      title: "Deactivated",
      value: deactivated,
      icon: UserX,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      description: "Suspended credentials",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="border border-border shadow-sm rounded-xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground tracking-tight">
                  {card.title}
                </span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium truncate">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
