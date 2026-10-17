import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Cpu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DemoNoticeBadgeProps {
  isDemo?: boolean;
  className?: string;
}

export const DemoNoticeBadge: React.FC<DemoNoticeBadgeProps> = ({ isDemo = false, className }) => {
  if (isDemo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 gap-1 font-mono text-[11px] ${className}`}
          >
            <Sparkles className="h-3 w-3" />
            Simulated / Demo Detection
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">
            This road damage record was generated using simulated mock inference coordinates for testing and demonstration.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 gap-1 font-mono text-[11px] ${className}`}
        >
          <Cpu className="h-3 w-3" />
          Genuine Model Inference
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs">
          This record originated from actual computer vision (YOLO/PyTorch) frame detection inference.
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
