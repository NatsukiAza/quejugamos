import { Suspense } from "react";
import { HomePanel } from "@/components/home-panel";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="page muted">…</div>}>
      <HomePanel searchParams={searchParams} />
    </Suspense>
  );
}
