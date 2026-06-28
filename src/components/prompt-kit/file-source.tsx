import { SourceBadge } from "@/components/assistant-ui/sources";

interface FileSourceProps {
  path: string;
  className?: string;
  size?: "default" | "compact";
  onPreview?: (path: string) => void;
}

/** @deprecated Prefer `Sources` / `Sources.Group` from `@/components/assistant-ui/sources`. */
export function FileSource({ path, className, size = "default", onPreview }: FileSourceProps) {
  return (
    <SourceBadge
      path={path}
      onPreview={onPreview}
      size={size === "compact" ? "sm" : "default"}
      className={className}
    />
  );
}
