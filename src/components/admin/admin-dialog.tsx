"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLanguage } from "../language-provider";

export function AdminDialog({
  open,
  onClose,
  title,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { t } = useLanguage();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      if (!element.open) element.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="admin-dialog"
      aria-label={title}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="admin-dialog-content">
        <header>
          <div>
            <span className="admin-kicker">MEHRIA KITCHEN MANAGER</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="admin-icon-button"
            disabled={busy}
            aria-label={t("Close dialog", "بند کریں")}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
