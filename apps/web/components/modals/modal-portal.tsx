"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

export function ModalPortal({ children, isOpen }: { children: ReactNode; isOpen: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: "instant" as any });
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(children, document.body);
}
