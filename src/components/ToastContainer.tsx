import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useToastStore, type ToastVariant } from "../store/useToastStore";

const variantStyles: Record<ToastVariant, string> = {
  success: "border-mint/40 bg-card-white",
  error: "border-ember-orange/40 bg-ember-orange/5",
  info: "border-mist bg-card-white",
};

const variantIcons: Record<ToastVariant, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  info: InformationCircleIcon,
};

const iconColors: Record<ToastVariant, string> = {
  success: "text-mint",
  error: "text-ember-orange",
  info: "text-forest-teal",
};

function ToastCard({
  variant,
  message,
  action,
  onDismiss,
}: {
  variant: ToastVariant;
  message: string;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}) {
  const Icon = variantIcons[variant];
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={[
        "pointer-events-auto toast-enter flex items-start gap-3 rounded-card border p-4 shadow-xl",
        variantStyles[variant],
      ].join(" ")}
    >
      <Icon className={["mt-0.5 h-6 w-6 shrink-0", iconColors[variant]].join(" ")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="type-body-sm text-deep-ink">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 type-caption font-medium text-deep-indigo hover:text-midnight-teal"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="app-control-icon inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-helper hover:bg-paper-white hover:text-carbon"
        aria-label="Dismiss notification"
      >
        <XMarkIcon aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  const politeToasts = toasts.filter((item) => item.variant !== "error");
  const errorToasts = toasts.filter((item) => item.variant === "error");

  return (
    <>
      {politeToasts.length > 0 && (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
          aria-live="polite"
          aria-atomic="false"
        >
          {politeToasts.map((item) => (
            <ToastCard
              key={item.id}
              variant={item.variant}
              message={item.message}
              action={item.action}
              onDismiss={() => removeToast(item.id)}
            />
          ))}
        </div>
      )}
      {errorToasts.length > 0 && (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[61] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
          aria-live="assertive"
          aria-atomic="false"
        >
          {errorToasts.map((item) => (
            <ToastCard
              key={item.id}
              variant={item.variant}
              message={item.message}
              action={item.action}
              onDismiss={() => removeToast(item.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
