"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

export function Brand({ light = false }: { light?: boolean }) {
  const { t, isUr } = useLanguage();
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label={t("Mehria Pulao home", "مہریہ پلاؤ کا مرکزی صفحہ")}
    >
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M9 26h30c0 9-6 15-15 15S9 35 9 26Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M6 26h36M17 21c-5-6 5-7 0-13m8 13c-5-6 5-7 0-13m8 13c-5-6 5-7 0-13M19 44h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={`brand-type ${isUr ? "brand-urdu" : ""}`}>
        {t("mehria", "مہریہ")}<span>{t("MURGH PULAO", "مرغ پلاؤ")}</span>
      </span>
    </Link>
  );
}
