import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  options: unknown;
}

interface CustomFieldInputProps {
  field: CustomField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export function CustomFieldInput({
  field,
  value,
  onChange,
  disabled = false,
}: CustomFieldInputProps) {
  const renderInput = () => {
    switch (field.field_type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`أدخل ${field.name}`}
            disabled={disabled}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value !== "" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`أدخل ${field.name}`}
            disabled={disabled}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            dir="ltr"
          />
        );

      case "select":
        const selectOptions = Array.isArray(field.options) ? (field.options as string[]) : [];
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`اختر ${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!value}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">
              {value ? "نعم" : "لا"}
            </span>
          </div>
        );

      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{field.name}</Label>
      {renderInput()}
    </div>
  );
}
