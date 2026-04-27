'use client';

import React from 'react';
import { Task } from '@/types/task';
import { isPastDate } from '@/lib/dateUtils';

interface CalendarDayProps {
  date: Date;
  tasks: Task[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  compact?: boolean;
  onSelect?: (date: Date) => void;
  onTaskClick?: (task: Task) => void;
  onExpandClick?: () => void;
}

export default function CalendarDay({
  date,
  tasks,
  isCurrentMonth,
  isToday,
  isSelected,
  compact = false,
  onSelect,
  onTaskClick,
  onExpandClick,
}: CalendarDayProps) {
  const isPast = isPastDate(date);
  const hasMultipleTasks = tasks.length > 2;
  const displayTasks = tasks.slice(0, 2);

  const getDayColor = (): string => {
    if (isToday) return 'bg-blue-500/20 border-blue-400/50';
    if (isSelected) return 'bg-neutral-700/50 border-neutral-500/50';
    if (!isCurrentMonth) return 'bg-neutral-900/30 border-neutral-700/30';
    return 'bg-neutral-800/30 border-neutral-700/30 hover:bg-neutral-800/50';
  };

  const getTaskIndicatorColor = (task: Task): string => {
    const deadlinePassed =
      task.deadline && isPastDate(task.deadline) && !isPastDate(new Date());

    if (deadlinePassed) return 'bg-red-500';
    if (hasMultipleTasks) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <button
      onClick={() => onSelect?.(date)}
      className={`relative w-full min-h-[100px] ${compact ? 'min-h-[60px]' : ''} p-2 rounded-lg border transition-all text-left ${getDayColor()} ${
        !isCurrentMonth && 'opacity-40 pointer-events-none'
      } ${isToday && 'ring-2 ring-blue-400/50'}`}
      aria-label={`${date.toDateString()}, ${tasks.length} tasks`}
    >
      {/* Day of month */}
      <div
        className={`font-semibold mb-1 ${
          isToday ? 'text-blue-300' : 'text-neutral-200'
        } ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {date.getDate()}
      </div>

      {/* Task indicators */}
      <div className="space-y-1">
        {displayTasks.map((task, index) => (
          <div
            key={task.id}
            className="flex items-center gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onTaskClick?.(task);
            }}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${getTaskIndicatorColor(
                task
              )}`}
            />
            <span className="text-neutral-300 truncate text-xs">
              {task.functionName}
            </span>
          </div>
        ))}

        {/* More tasks indicator */}
        {hasMultipleTasks && (
          <button
            className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors w-full text-center border border-orange-500/20 mt-1"
            onClick={(e) => {
              e.stopPropagation();
              onExpandClick?.();
            }}
          >
            +{tasks.length - 2} more
          </button>
        )}
      </div>

      {/* Dense date indicator (visual hint) */}
      {hasMultipleTasks && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-400 opacity-60" />
      )}
    </button>
  );
}
