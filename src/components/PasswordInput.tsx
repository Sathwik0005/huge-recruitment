"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.36 5.14A9.87 9.87 0 0112 5c5 0 9 4 10 7-.36 1.1-1.05 2.34-2.02 3.46M6.6 6.6C4.6 7.9 3.06 9.86 2 12c1 3 5 7 10 7 1.26 0 2.44-.24 3.5-.66"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
          </svg>
        )}
      </button>
    </div>
  );
}
