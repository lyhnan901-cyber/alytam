import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfDay, subDays, startOfMonth, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export type DatePreset = "today" | "yesterday" | "last7days" | "thisMonth" | "custom" | null;

export interface TaskDateFilterValue {
  preset: DatePreset;
  dateFrom: Date | null;
  dateTo: Date | null;
  includeNoDueDate: boolean;
}

interface TaskDateFilterProps {
  value: TaskDateFilterValue;
  onChange: (value: TaskDateFilterValue) => void;
}

const presetLabels: Record<Exclude<DatePreset, null | "custom">, string> = {
  today: "اليوم",
  yesterday: "أمس",
  last7days: "آخر 7 أيام",
  thisMonth: "هذا الشهر",
};

export function TaskDateFilter({ value, onChange }: TaskDateFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = (preset: DatePreset) => {
    const today = startOfDay(new Date());
    
    switch (preset) {
      case "today":
        onChange({
          preset,
          dateFrom: today,
          dateTo: endOfDay(today),
          includeNoDueDate: value.includeNoDueDate,
        });
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        onChange({
          preset,
          dateFrom: yesterday,
          dateTo: endOfDay(yesterday),
          includeNoDueDate: value.includeNoDueDate,
        });
        break;
      case "last7days":
        onChange({
          preset,
          dateFrom: subDays(today, 6),
          dateTo: endOfDay(today),
          includeNoDueDate: value.includeNoDueDate,
        });
        break;
      case "thisMonth":
        onChange({
          preset,
          dateFrom: startOfMonth(today),
          dateTo: endOfDay(today),
          includeNoDueDate: value.includeNoDueDate,
        });
        break;
      default:
        onChange({
          preset: null,
          dateFrom: null,
          dateTo: null,
          includeNoDueDate: value.includeNoDueDate,
        });
    }
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      onChange({
        preset: "custom",
        dateFrom: startOfDay(range.from),
        dateTo: range.to ? endOfDay(range.to) : endOfDay(range.from),
        includeNoDueDate: value.includeNoDueDate,
      });
    }
  };

  const handleIncludeNoDueDateChange = (checked: boolean) => {
    onChange({
      ...value,
      includeNoDueDate: checked,
    });
  };

  const clearFilter = () => {
    onChange({
      preset: null,
      dateFrom: null,
      dateTo: null,
      includeNoDueDate: false,
    });
  };

  const isActive = value.preset !== null;

  const getDisplayText = () => {
    if (!value.preset) return null;
    if (value.preset === "custom" && value.dateFrom) {
      if (value.dateTo && value.dateFrom.getTime() !== startOfDay(value.dateTo).getTime()) {
        return `${format(value.dateFrom, "d MMM", { locale: ar })} - ${format(value.dateTo, "d MMM", { locale: ar })}`;
      }
      return format(value.dateFrom, "d MMM yyyy", { locale: ar });
    }
    return presetLabels[value.preset as keyof typeof presetLabels];
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1 date-filter-scroll">
        {(Object.keys(presetLabels) as Array<keyof typeof presetLabels>).map((preset) => (
          <Button
            key={preset}
            variant={value.preset === preset ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(preset)}
          >
            {presetLabels[preset]}
          </Button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={value.preset === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {value.preset === "custom" && value.dateFrom
              ? getDisplayText()
              : "نطاق مخصص"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value.dateFrom || new Date()}
            selected={{
              from: value.dateFrom || undefined,
              to: value.dateTo || undefined,
            }}
            onSelect={handleCustomRangeChange}
            numberOfMonths={2}
            locale={ar}
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="border-t p-3 flex items-center gap-2">
            <Checkbox
              id="includeNoDueDate"
              checked={value.includeNoDueDate}
              onCheckedChange={handleIncludeNoDueDateChange}
            />
            <Label htmlFor="includeNoDueDate" className="text-sm cursor-pointer">
              عرض المهام بدون تاريخ تسليم
            </Label>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badge */}
      {isActive && (
        <Badge variant="secondary" className="gap-1 px-2 py-1">
          <CalendarIcon className="w-3 h-3" />
          <span>{getDisplayText()}</span>
          {value.includeNoDueDate && <span className="text-muted-foreground">+ بدون تاريخ</span>}
          <button
            onClick={clearFilter}
            className="mr-1 hover:bg-muted rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}
