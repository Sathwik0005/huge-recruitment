export function ExportCsvButton({ queryString }: { queryString: string }) {
  const href = queryString ? `/api/admin/candidates/export?${queryString}` : "/api/admin/candidates/export";
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
    >
      <span className="material-symbols-outlined text-sm" aria-hidden="true">
        download
      </span>
      Export CSV
    </a>
  );
}
