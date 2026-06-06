import { useEffect, useRef, useState } from "react";
import { currentUser } from "@/lib/mediflow-store";
import { getSuggestions, learn } from "@/lib/suggestions";

interface Props {
  field: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SmartInput({ field, value, onChange, placeholder, label, className }: Props) {
  const u = currentUser();
  const hosp = u?.hospitalCode ?? "default";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(getSuggestions(hosp, field, value));
  }, [hosp, field, value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      {label && (
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (value.trim()) learn(hosp, field, value);
        }}
        placeholder={placeholder}
        className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm ring-focus"
      />
      {open && items.length > 0 && (
        <div className="absolute z-30 mt-1 left-0 right-0 glass-strong rounded-xl p-1 max-h-56 overflow-auto">
          {items.map((it) => (
            <button
              type="button"
              key={it}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(it);
                learn(hosp, field, it);
                setOpen(false);
              }}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between"
            >
              <span>{it}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {field.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
