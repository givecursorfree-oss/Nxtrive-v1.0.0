import { cn } from "@/lib/utils";
import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type FileUploadContextValue = {
  isDragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  multiple?: boolean;
  disabled?: boolean;
};

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

export type FileUploadProps = {
  onFilesAdded: (files: File[]) => void;
  children: ReactNode;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
};

export function FileUpload({
  onFilesAdded,
  children,
  multiple = true,
  accept,
  disabled = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleFiles = useCallback(
    (files: FileList) => {
      const newFiles = Array.from(files);
      if (multiple) {
        onFilesAdded(newFiles);
      } else {
        onFilesAdded(newFiles.slice(0, 1));
      }
    },
    [multiple, onFilesAdded],
  );

  useEffect(() => {
    const handleDrag = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragIn = (event: DragEvent) => {
      handleDrag(event);
      dragCounter.current += 1;
      if (event.dataTransfer?.items.length) {
        setIsDragging(true);
      }
    };

    const handleDragOut = (event: DragEvent) => {
      handleDrag(event);
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (event: DragEvent) => {
      handleDrag(event);
      setIsDragging(false);
      dragCounter.current = 0;
      if (event.dataTransfer?.files.length) {
        handleFiles(event.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragIn);
    window.addEventListener("dragleave", handleDragOut);
    window.addEventListener("dragover", handleDrag);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragIn);
      window.removeEventListener("dragleave", handleDragOut);
      window.removeEventListener("dragover", handleDrag);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleFiles]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      handleFiles(event.target.files);
      event.target.value = "";
    }
  };

  return (
    <FileUploadContext.Provider value={{ isDragging, inputRef, multiple, disabled }}>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={handleFileSelect}
        tabIndex={-1}
        aria-hidden
      />
      {children}
    </FileUploadContext.Provider>
  );
}

export type FileUploadTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
};

export function FileUploadTrigger({
  asChild = false,
  className,
  children,
  ...props
}: FileUploadTriggerProps) {
  const context = useContext(FileUploadContext);

  const handleClick = () => {
    if (!context?.disabled) {
      context?.inputRef.current?.click();
    }
  };

  if (asChild) {
    const child = Children.only(children) as ReactElement<React.HTMLAttributes<HTMLElement>>;
    return cloneElement(child, {
      ...props,
      role: "button",
      className: cn(className, child.props.className),
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        handleClick();
        child.props.onClick?.(event as React.MouseEvent<HTMLElement>);
      },
    });
  }

  return (
    <button type="button" className={className} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

type FileUploadContentProps = React.HTMLAttributes<HTMLDivElement>;

export function FileUploadContent({ className, ...props }: FileUploadContentProps) {
  const context = useContext(FileUploadContext);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!context?.isDragging || !mounted || context.disabled) {
    return null;
  }

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-deep-ink/40 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <div className="m-4 w-full max-w-md rounded-card border border-mist bg-card-white p-8 shadow-xl">
        <div className="mb-4 flex justify-center text-slate" aria-hidden>
          <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-center type-body font-medium text-deep-ink">Drop files to upload</h3>
        <p className="text-center type-body-sm text-slate">Release to add files to your library</p>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
