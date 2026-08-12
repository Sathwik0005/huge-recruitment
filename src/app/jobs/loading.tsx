export default function JobsLoading() {
  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-14">
      <div className="mb-8 h-24 max-w-3xl animate-pulse rounded-lg bg-surface-container-low" />
      <div className="mb-6 h-20 animate-pulse rounded-lg bg-surface-container-low" />
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-lg bg-surface-container-low" />
        ))}
      </div>
    </main>
  );
}
