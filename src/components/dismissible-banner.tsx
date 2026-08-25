"use client";

import { useEffect, useState } from "react";

export default function DismissibleBanner({
  message,
  variant,
  className = "",
}: {
  message: string;
  variant: "error" | "success";
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const colors = variant === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700";

  return <p className={`rounded-md px-3 py-2 text-sm ${colors} ${className}`}>{message}</p>;
}
