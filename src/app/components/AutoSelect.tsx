"use client";

import type { SelectHTMLAttributes } from "react";

/** A select that submits its enclosing GET form when the value changes. */
export default function AutoSelect({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
