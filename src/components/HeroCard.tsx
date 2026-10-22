"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Plus, Wallet } from "lucide-react";

interface Props {
  topLeft?: ReactNode;
  yellowRight: string;
  purpleRight: string;
  label: string;
  amount: string;
  sideLabel: string;
  sideValue: string;
  bottomLabel: string;
  bottomValue: string;
  progress: number;
  onAdd: () => void;
}

const H = 158; // purple shape height
const R = 28; // outer radius
const F = 16; // concave fillet radius
const NW = 148; // notch width
const NH = 48; // notch height

/** Purple card with a rounded bottom-right notch (for the Add button), drawn as one SVG path. */
function shape(w: number) {
  const ny = H - NH;
  const nx = w - NW;
  return [
    `M${R} 0`, `H${w - R}`, `A${R} ${R} 0 0 1 ${w} ${R}`,
    `V${ny - R}`, `A${R} ${R} 0 0 1 ${w - R} ${ny}`,
    `H${nx + F}`, `A${F} ${F} 0 0 0 ${nx} ${ny + F}`,
    `V${H - R}`, `A${R} ${R} 0 0 1 ${nx - R} ${H}`,
    `H${R}`, `A${R} ${R} 0 0 1 0 ${H - R}`,
    `V${R}`, `A${R} ${R} 0 0 1 ${R} 0`, "Z",
  ].join(" ");
}

export function HeroCard(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(340);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(el.clientWidth, NW + 2 * R)));
    ro.observe(el);
    setW(Math.max(el.clientWidth, NW + 2 * R));
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md" style={{ height: H + 44 }}>
      {/* yellow card peeking behind */}
      <div className="absolute inset-x-0 top-0 h-24 rounded-[28px] bg-[#ffd666] px-5 pt-3 text-black">
        <div className="flex items-start justify-between">
          <span className="flex h-[18px] w-7 items-center justify-center rounded-full bg-black"><Wallet className="h-3 w-3 text-[#ffd666]" /></span>
          <span className="text-[11px] font-medium tracking-wide">{p.yellowRight}</span>
        </div>
      </div>

      {/* purple card */}
      <div className="absolute inset-x-0 text-white" style={{ top: 44, height: H }}>
        <svg width={w} height={H} className="absolute inset-0" aria-hidden>
          <path d={shape(w)} fill="#9b3fd6" />
        </svg>
        <div className="relative px-5 pt-3">
          <div className="flex items-start justify-between">
            <Wallet className="h-[18px] w-[18px]" />
            <span className="text-[11px] font-medium tracking-wide">{p.purpleRight}</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[10px]">{p.label}</p>
              <p className="text-[22px] font-medium leading-tight tabular-nums">{p.amount}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px]">{p.sideLabel}</p>
              <p className="text-xs font-medium">{p.sideValue}</p>
            </div>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(Math.max(p.progress, 0), 1) * 100}%` }} />
          </div>
        </div>
        <div className="absolute bottom-2.5 left-5">
          <p className="text-[9px]">{p.bottomLabel}</p>
          <p className="text-xs font-medium tabular-nums">{p.bottomValue}</p>
        </div>
      </div>

      <button
        onClick={p.onAdd}
        className="absolute bottom-0 right-0 flex h-10 items-center gap-2.5 rounded-full bg-black pl-1.5 pr-5 text-xs font-medium text-white dark:bg-[#1c1c1f]"
        style={{ width: NW - 6 }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black"><Plus className="h-4 w-4" /></span>Add
      </button>
    </div>
  );
}
