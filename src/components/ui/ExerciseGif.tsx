"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ExerciseGifProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  imgClassName?: string;
}

export function ExerciseGif({
  src,
  alt,
  title,
  className = "w-12 h-12 rounded-lg bg-bg",
  imgClassName = "w-full h-full object-cover",
}: ExerciseGifProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`group relative overflow-hidden shrink-0 cursor-zoom-in ${className}`}
        aria-label={t("common.zoom")}
      >
        <img src={src} alt={alt} className={imgClassName} />
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Maximize2 className="w-5 h-5 text-white" />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
          {title && (
            <p className="text-white font-semibold text-center px-6 mb-4 max-w-md">
              {title}
            </p>
          )}
          <img
            src={src}
            alt={title ?? alt}
            className="max-w-full max-h-[80vh] object-contain select-none"
          />
          <p className="text-xs text-white/50 mt-4">{t("ex.closeViewer")}</p>
        </div>
      )}
    </>
  );
}