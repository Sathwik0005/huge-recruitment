import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/sectors", label: "Sectors" },
];

export default function AdminNav() {
  return (
    <nav
      aria-label="Admin navigation"
      className="border-b border-outline-variant bg-surface-container-lowest"
    >
      <div className="max-w-container-max mx-auto flex items-center gap-1 px-margin-mobile md:px-margin-desktop">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded px-4 py-3 transition-all"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
