import { ArrowRight } from "lucide-react";

type DistancePlateProps = {
  label: string;
  value: string;
  arrow?: boolean;
};

/** DESIGN.md section 6.2: rail plate, 2px white inner border, label, mono value, arrow. */
export function DistancePlate({ label, value, arrow = false }: DistancePlateProps) {
  return (
    <div className="inline-flex max-w-full rounded-md border border-rail bg-rail p-0.5 text-rail-fg">
      <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-sm border-2 border-rail-fg px-4 py-1.5">
        <span className="text-label font-bold tracking-[0.08em] uppercase">{label}</span>
        <span aria-hidden="true" className="text-rail-fg/70">
          ·
        </span>
        <span className="font-mono text-h2 font-semibold">{value}</span>
        {arrow ? <ArrowRight aria-hidden="true" className="size-5 shrink-0" /> : null}
      </div>
    </div>
  );
}
