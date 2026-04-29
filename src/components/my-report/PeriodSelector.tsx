import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type PeriodType = "today" | "week" | "month" | "custom";

interface PeriodSelectorProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
}

export function PeriodSelector({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={period === "today" ? "default" : "outline"}
        size="sm"
        onClick={() => onPeriodChange("today")}
      >
        اليوم
      </Button>
      <Button
        variant={period === "week" ? "default" : "outline"}
        size="sm"
        onClick={() => onPeriodChange("week")}
      >
        هذا الأسبوع
      </Button>
      <Button
        variant={period === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => onPeriodChange("month")}
      >
        هذا الشهر
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={period === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("gap-2", period === "custom" && customRange?.from && "min-w-[200px]")}
            onClick={() => onPeriodChange("custom")}
          >
            <CalendarIcon className="h-4 w-4" />
            {period === "custom" && customRange?.from ? (
              customRange.to ? (
                <>
                  {format(customRange.from, "d MMM", { locale: ar })} -{" "}
                  {format(customRange.to, "d MMM", { locale: ar })}
                </>
              ) : (
                format(customRange.from, "d MMM yyyy", { locale: ar })
              )
            ) : (
              "فترة مخصصة"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={customRange?.from}
            selected={customRange}
            onSelect={onCustomRangeChange}
            numberOfMonths={2}
            locale={ar}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
