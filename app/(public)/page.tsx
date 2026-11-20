import { Suspense } from "react";
import { connection } from "next/server";
import { DistancePlate } from "@/components/brand/distance-plate";

// Read per request: with cacheComponents the page shell is prerendered, and the
// demo flag must follow the running deployment's environment, not the build's.
async function DemoBanner() {
  await connection();
  if (process.env.DEMO_MODE !== "true") return null;
  return (
    <p className="border-b border-border bg-surface-2 px-4 py-2 text-small font-semibold text-fg md:px-8">
      Demo – all data is fictional
    </p>
  );
}

export default function HomePage() {
  return (
    <>
      <header className="bg-rail text-rail-fg">
        <div className="px-4 py-6 md:px-8">
          <h1 className="text-h1">JTMK e-Quarantine</h1>
        </div>
      </header>
      <main className="min-h-[calc(100dvh-5rem)] bg-bg">
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <div className="flex flex-col items-start gap-6 px-4 py-8 md:px-8 md:py-12">
          <p className="max-w-prose text-body text-fg-muted">
            Security-first remake of a 2022 diploma project: COVID-19 quarantine tracking for JTMK.
          </p>
          <DistancePlate label="v2" value="Phase 0" arrow />
        </div>
      </main>
    </>
  );
}
