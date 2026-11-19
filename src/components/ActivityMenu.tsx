import { useRef, useState, type ReactNode } from "react";

export function ActivityMenu({ children }: { children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={trigger}
        className="activity-trigger"
        popoverTarget="camp-activities"
        aria-expanded={open}
        aria-controls="camp-activities"
      >
        <span aria-hidden="true">{open ? "×" : "✦"}</span>
        {open ? "닫기" : "캠프 활동"}
      </button>
      <div
        ref={panel}
        id="camp-activities"
        className="actions"
        popover="auto"
        role="group"
        aria-label="캠프파이어 활동"
        onToggle={(event) => setOpen(event.newState === "open")}
        onClickCapture={(event) => {
          const button = (event.target as Element).closest("button");
          if (!button || button.disabled) return;
          panel.current?.hidePopover();
          trigger.current?.focus();
        }}
      >
        {children}
      </div>
    </>
  );
}
