// --- src/components/quiz/QuizProgress.jsx ---
// Thanh tiến trình và hiểm thị điểm/streak ở trên cùng bài thi.

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy } from "lucide-react";

export function QuizProgress({ currentIndex, total, score, streak }) {
  const progressPercent = ((currentIndex + 1) / total) * 100;

  return (
    <div className="w-full space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-muted-foreground">
          Câu {currentIndex + 1} / {total}
        </div>
        
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-none animate-in zoom-in-50 duration-300">
              <Flame className="w-3.5 h-3.5 mr-1" />
              {streak} Streak
            </Badge>
          )}
          
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            {score}
          </Badge>
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-2" />
    </div>
  );
}
