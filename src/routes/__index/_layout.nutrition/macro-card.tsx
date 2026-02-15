import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MacroCardProps {
  title: string;
  value: number;
  unit: string;
  color: string;
}

export function MacroCard({ title, value, unit, color }: MacroCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          <div className={cn("w-2 h-2 rounded-full", color)} />
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {value}
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
