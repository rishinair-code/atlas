import { ALL_PLACES } from "@/data";
import Discover from "./components/Discover";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="pb-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Find somewhere to go
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          {ALL_PLACES.length} curated places plus the live map — filter by what
          you want to do, how far you&apos;ll go, and what it costs to get there.
        </p>
      </section>

      <Discover />
    </div>
  );
}
