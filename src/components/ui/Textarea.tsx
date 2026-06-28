import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function Textarea({ label, hint, className = "", id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint ? `${textareaId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="mb-2 block type-body-sm font-medium text-carbon">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-describedby={hintId}
        className={[
          "surface-input w-full resize-none px-4 py-3 type-body-sm placeholder:text-helper",
          className,
        ].join(" ")}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 type-caption text-helper">
          {hint}
        </p>
      )}
    </div>
  );
}
