"use client";
import { useRef, type ReactNode } from "react";
export function ResponsivePanel({
  title,
  children,
  side = "left",
}: {
  title: string;
  children: ReactNode;
  side?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <div className="responsive-panel">
      <div className="desktop-panel">{children}</div>
      <button
        className="mobile-panel-trigger secondary"
        onClick={() => dialog.current?.showModal()}
      >
        {title}
      </button>
      <dialog
        ref={dialog}
        className={"mobile-panel " + side}
        aria-label={title}
      >
        <button className="secondary" onClick={() => dialog.current?.close()}>
          关闭{title}
        </button>
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) dialog.current?.close();
          }}
        >
          {children}
        </div>
      </dialog>
    </div>
  );
}
