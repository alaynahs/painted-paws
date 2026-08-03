"use client";

import { Children, useState } from "react";

export default function ShowMoreList({
  initialCount = 3,
  children,
}: {
  initialCount?: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const remaining = items.length - initialCount;
  const visible = expanded ? items : items.slice(0, initialCount);

  return (
    <>
      {visible}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-accent-dark hover:underline"
        >
          View {remaining} more
        </button>
      )}
    </>
  );
}
