export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">You're offline</h1>
      <p className="mt-3 text-slate-400">
        Atlas couldn't reach the network. Your saved trips will sync once you're
        back online.
      </p>
    </div>
  );
}
