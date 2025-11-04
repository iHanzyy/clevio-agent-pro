"use client";
import { useCallback, useEffect } from "react";

export default function TemplateConfirmationDialog({
  isOpen,
  template,
  onConfirm,
  onCancel,
  isLoading,
}) {
  useEffect(() => {
    if (!isOpen) {
      // Dispatch close event
      window.dispatchEvent(
        new CustomEvent("modalStateChange", { detail: { isOpen: false } })
      );
      return;
    }

    // Dispatch open event
    window.dispatchEvent(
      new CustomEvent("modalStateChange", { detail: { isOpen: true } })
    );

    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyPadding = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPadding;
      window.dispatchEvent(
        new CustomEvent("modalStateChange", { detail: { isOpen: false } })
      );
    };
  }, [isOpen]);

  const preventScroll = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        onWheel={preventScroll}
        onTouchMove={preventScroll}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-surface-strong/60 bg-surface p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-foreground">
            Start Agent Interview
          </h3>
          <p className="mt-2 text-sm text-muted">
            You&apos;re about to start chatting with Agent Interview
          </p>
        </div>

        {/* Template Preview */}
        <div className="mb-6 rounded-xl border border-surface-strong/60 bg-background p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
              {template.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{template.name}</h4>
              <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {template.category}
              </span>
              <p className="mt-2 text-sm text-muted line-clamp-2">
                {template.description}
              </p>
            </div>
          </div>
        </div>

        {/* Interview Info */}
        <div className="mb-6 rounded-xl bg-accent/5 border border-accent/20 p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            What to expect:
          </h4>
          <ul className="space-y-1.5 text-sm text-muted">
            <li className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Agent Interview will ask about your agent&apos;s name</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Customize capabilities and behavior</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Refine system prompts and settings</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Auto-fill form when interview completes</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-surface-strong/60 bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-strong/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Starting...
              </span>
            ) : (
              "Start Interview"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
