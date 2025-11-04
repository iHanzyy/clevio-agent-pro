"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_SPACING = 18;

function resolveElement(selector) {
  if (typeof selector === "function") {
    return selector();
  }
  if (typeof selector === "string") {
    return document.querySelector(selector);
  }
  if (selector instanceof HTMLElement) {
    return selector;
  }
  return null;
}

function computePopoverPosition(
  rect,
  placement = "bottom-start",
  spacing = DEFAULT_SPACING
) {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const positions = {
    "bottom-start": {
      top: rect.bottom + spacing,
      left: rect.left,
    },
    "bottom-center": {
      top: rect.bottom + spacing,
      left: rect.left + rect.width / 2,
      transform: "translateX(-50%)",
    },
    "bottom-end": {
      top: rect.bottom + spacing,
      left: rect.right,
      transform: "translateX(-100%)",
    },
    "top-start": {
      top: rect.top - spacing,
      left: rect.left,
      transform: "translateY(-100%)",
    },
    "top-center": {
      top: rect.top - spacing,
      left: rect.left + rect.width / 2,
      transform: "translate(-50%, -100%)",
    },
    "right-center": {
      top: rect.top + rect.height / 2,
      left: rect.right + spacing,
      transform: "translateY(-50%)",
    },
    "left-center": {
      top: rect.top + rect.height / 2,
      left: rect.left - spacing,
      transform: "translate(-100%, -50%)",
    },
  };

  return positions[placement] ?? positions["bottom-start"];
}

function clampPopover(style, rect, placement) {
  if (!rect) return style;
  const next = { ...style };
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (typeof next.left === "number") {
    if (next.left < 16) {
      next.left = 16;
      next.transform = undefined;
    }
    if (next.left > width - 320) {
      next.left = width - 320;
      if (placement?.includes("center")) {
        next.transform = undefined;
      }
    }
  }

  if (typeof next.top === "number") {
    if (next.top < 16) {
      next.top = 16;
      if (placement?.startsWith("top")) {
        next.transform = undefined;
      }
    }
    if (next.top > height - 220) {
      next.top = height - 220;
      if (!placement?.startsWith("top")) {
        next.transform = undefined;
      }
    }
  }

  return next;
}

export default function AgentFormTour({
  steps = [],
  isOpen = false,
  onClose,
  onStepChange,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentRect, setCurrentRect] = useState(null);
  const [currentElement, setCurrentElement] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
      setCurrentRect(null);
      setCurrentElement(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const step = steps?.[activeIndex];
    if (!step) return;

    const element = resolveElement(step.selector);

    if (currentElement && currentElement !== element) {
      currentElement.classList.remove("tour-highlight");
      // Reset any inline styles
      currentElement.style.removeProperty("z-index");
      currentElement.style.removeProperty("position");
    }

    if (element) {
      element.classList.add("tour-highlight");

      // Force element to be positioned and above overlay
      if (!element.style.position || element.style.position === "static") {
        element.style.position = "relative";
      }
      element.style.zIndex = "1150";

      setCurrentRect(element.getBoundingClientRect());
      setCurrentElement(element);

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      const tm = setTimeout(() => {
        if (!document.body.contains(element)) return;
        setCurrentRect(element.getBoundingClientRect());
      }, 250);

      const updateRect = () => {
        if (!element) return;
        setCurrentRect(element.getBoundingClientRect());
      };

      window.addEventListener("resize", updateRect);
      window.addEventListener("scroll", updateRect, true);

      return () => {
        clearTimeout(tm);
        window.removeEventListener("resize", updateRect);
        window.removeEventListener("scroll", updateRect, true);
        if (element) {
          element.classList.remove("tour-highlight");
          element.style.removeProperty("z-index");
          element.style.removeProperty("position");
        }
      };
    } else {
      setCurrentRect(null);
      setCurrentElement(null);
    }
  }, [activeIndex, steps, isOpen, currentElement]);

  const goTo = useCallback(
    (index) => {
      setActiveIndex(index);
      onStepChange?.(index);
    },
    [onStepChange]
  );

  const handleNext = useCallback(() => {
    const next = activeIndex + 1;
    if (next < steps.length) {
      goTo(next);
    } else {
      // PERBAIKAN: Tour selesai, panggil onClose
      onClose?.();
    }
  }, [activeIndex, steps, goTo, onClose]);

  const handleBack = useCallback(() => {
    const prev = activeIndex - 1;
    if (prev >= 0) {
      goTo(prev);
    }
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
      if (event.key === "ArrowRight") {
        handleNext();
      }
      if (event.key === "ArrowLeft") {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, handleNext, handleBack, onClose]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const activeStep = steps?.[activeIndex];
  const popoverStyle = useMemo(() => {
    if (!activeStep) return {};
    const base = computePopoverPosition(
      currentRect,
      activeStep.placement,
      activeStep.spacing ?? DEFAULT_SPACING
    );
    return clampPopover(base, currentRect, activeStep.placement);
  }, [activeStep, currentRect]);

  if (!mounted || !isOpen || !activeStep) {
    return null;
  }

  return createPortal(
    <div className="tour-overlay-wrapper">
      <div className="tour-dim" onClick={() => onClose?.()} />
      <div
        className="tour-popover"
        style={popoverStyle}
        data-placement={activeStep.placement}
      >
        <div className="tour-popover-body">
          <span className="tour-step-indicator">
            Step {activeIndex + 1} of {steps.length}
          </span>
          <h3 className="tour-title">{activeStep.title}</h3>
          <p className="tour-description">{activeStep.description}</p>
          {activeStep.hint && <p className="tour-hint">{activeStep.hint}</p>}
          <div className="tour-actions">
            <button
              type="button"
              className="tour-secondary"
              onClick={() => onClose?.()}
            >
              Skip tour
            </button>
            <div className="tour-primary-actions">
              {activeIndex > 0 && (
                <button
                  type="button"
                  className="tour-secondary"
                  onClick={handleBack}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="tour-primary"
                onClick={handleNext}
              >
                {activeIndex + 1 === steps.length
                  ? activeStep.finishLabel || "Finish"
                  : activeStep.nextLabel || "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
