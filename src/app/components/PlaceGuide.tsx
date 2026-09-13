import type { PlaceDetails } from "@/lib/types";

function ItemList({
  items,
}: {
  items: { name?: string; area?: string; note: string }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.name ?? item.area ?? i} className="flex flex-col">
          {(item.name || item.area) && (
            <span className="font-medium text-slate-100">{item.name ?? item.area}</span>
          )}
          <span className="text-sm text-slate-400">{item.note}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Editorial guide content for a place: popular areas, where to stay,
 * food & drink, and tips. Hidden entirely when the place has no details.
 */
export default function PlaceGuide({ details }: { details: PlaceDetails }) {
  const hasAny =
    (details.popularAreas?.length ?? 0) > 0 ||
    (details.whereToStay?.length ?? 0) > 0 ||
    (details.foodDrink?.length ?? 0) > 0 ||
    (details.tips?.length ?? 0) > 0;
  if (!hasAny) return null;

  return (
    <section className="mt-12 grid gap-8 lg:grid-cols-2">
      {(details.popularAreas?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Popular areas</h2>
          <div className="mt-3">
            <ItemList items={details.popularAreas!} />
          </div>
        </div>
      )}
      {(details.whereToStay?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Where to stay</h2>
          <div className="mt-3">
            <ItemList items={details.whereToStay!} />
          </div>
        </div>
      )}
      {(details.foodDrink?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Food & drink</h2>
          <div className="mt-3">
            <ItemList items={details.foodDrink!} />
          </div>
        </div>
      )}
      {(details.tips?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">Tips & only-here experiences</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {details.tips!.map((tip) => (
              <li key={tip.slice(0, 40)}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
