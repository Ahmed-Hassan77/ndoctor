import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Side-by-side English / Arabic inputs for doctor public profile fields.
 */
export function BilingualFieldRow({
  id,
  labelEn,
  labelAr,
  enValue,
  arValue,
  onEnChange,
  onArChange,
  multiline = false,
  rows = 3,
  enError,
  arError,
  enPlaceholder,
  arPlaceholder,
  hintEn,
  hintAr,
  required = true,
  disabled = false,
}) {
  const Field = multiline ? Textarea : Input;
  const fieldProps = multiline ? { rows } : { type: "text" };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor={`${id}-en`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {labelEn} {required ? "*" : ""}
          </Label>
          {hintEn ? (
            <p className="text-xs text-muted-foreground">{hintEn}</p>
          ) : null}
          <Field
            id={`${id}-en`}
            dir="ltr"
            lang="en"
            value={enValue}
            onChange={(e) => onEnChange(e.target.value)}
            placeholder={enPlaceholder}
            className="text-start"
            disabled={disabled}
            readOnly={disabled}
            {...fieldProps}
          />
          {enError ? (
            <p className="text-sm font-medium text-red-500">{enError}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor={`${id}-ar`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {labelAr} {required ? "*" : ""}
          </Label>
          {hintAr ? (
            <p className="text-xs text-muted-foreground">{hintAr}</p>
          ) : null}
          <Field
            id={`${id}-ar`}
            dir="rtl"
            lang="ar"
            value={arValue}
            onChange={(e) => onArChange(e.target.value)}
            placeholder={arPlaceholder}
            className="text-start"
            disabled={disabled}
            readOnly={disabled}
            {...fieldProps}
          />
          {arError ? (
            <p className="text-sm font-medium text-red-500">{arError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
