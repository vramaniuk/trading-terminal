interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

const C_CYAN = "oklch(0.785 0.135 200)";

export function SectionHeader({ title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <h2
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "oklch(0.612 0.020 240)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <span className="text-[10px]" style={{ color: "oklch(0.450 0.015 240)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: C_CYAN,
            border: "1px solid oklch(0.785 0.135 200 / 0.20)",
          }}
        >
          {badge}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "oklch(1 0 0 / 0.07)" }} />
    </div>
  );
}
