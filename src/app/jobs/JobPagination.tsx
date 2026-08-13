function hrefForPage(basePath: string, searchParams: URLSearchParams, page: number): string {
  const next = new URLSearchParams(searchParams);
  next.set("page", String(page));
  return `${basePath}?${next.toString()}`;
}

export function JobPagination({
  page,
  pageCount,
  searchParams,
  basePath = "/jobs",
  label = "Jobs pagination",
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
  basePath?: string;
  label?: string;
}) {
  if (pageCount <= 1) return null;

  const params = new URLSearchParams(
    Object.entries(searchParams).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav aria-label={label} className="mt-8 flex items-center justify-center gap-2">
      <a
        href={page > 1 ? hrefForPage(basePath, params, page - 1) : undefined}
        aria-disabled={page <= 1}
        className={`flex size-11 items-center justify-center rounded-lg border border-outline-variant text-primary transition hover:border-primary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        <span className="sr-only">Previous page</span>
        <span aria-hidden="true" className="material-symbols-outlined">
          chevron_left
        </span>
      </a>

      {pages.map((pageNumber) => (
        <a
          key={pageNumber}
          href={hrefForPage(basePath, params, pageNumber)}
          aria-current={page === pageNumber ? "page" : undefined}
          className={
            page === pageNumber
              ? "flex size-11 items-center justify-center rounded-lg bg-primary font-bold text-on-primary"
              : "flex size-11 items-center justify-center rounded-lg border border-outline-variant text-primary transition hover:border-primary"
          }
        >
          {pageNumber}
        </a>
      ))}

      <a
        href={page < pageCount ? hrefForPage(basePath, params, page + 1) : undefined}
        aria-disabled={page >= pageCount}
        className={`flex size-11 items-center justify-center rounded-lg border border-outline-variant text-primary transition hover:border-primary ${page >= pageCount ? "pointer-events-none opacity-40" : ""}`}
      >
        <span className="sr-only">Next page</span>
        <span aria-hidden="true" className="material-symbols-outlined">
          chevron_right
        </span>
      </a>
    </nav>
  );
}
