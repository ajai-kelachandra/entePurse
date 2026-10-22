"use client";

import { Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Transaction } from "@/lib/types";
import { money } from "@/lib/format";
import { colorFor } from "./ui";

export function TxnRow({ t, onEdit, onDelete }: { t: Transaction; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <span className="h-10 w-10 shrink-0 rounded-full" style={{ background: `${colorFor(t.category)}26`, boxShadow: `inset 0 0 0 2px ${colorFor(t.category)}55` }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t.note || t.category}</p>
        <p className="truncate text-xs text-muted">
          {t.category} · {t.method}
          {t.tags.length > 0 && ` · ${t.tags.map((x) => `#${x}`).join(" ")}`}
        </p>
      </div>
      <p className={clsx("text-sm font-semibold tabular-nums", t.type === "income" ? "text-good" : "text-ink")}>
        {t.type === "income" ? "+" : "-"}{money(t.amount)}
      </p>
      {(onEdit || onDelete) && (
        <div className="flex gap-0.5">
          {onEdit && <button aria-label="Edit" onClick={onEdit} className="rounded-lg p-1.5 text-muted hover:bg-subtle"><Pencil className="h-3.5 w-3.5" /></button>}
          {onDelete && <button aria-label="Delete" onClick={onDelete} className="rounded-lg p-1.5 text-muted hover:bg-bad/10 hover:text-bad"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      )}
    </div>
  );
}
