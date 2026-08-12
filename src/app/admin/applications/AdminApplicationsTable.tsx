import Link from "next/link";

type AdminApplicationRow = {
  id: string;
  publicReference: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: Date;
  job: { title: string };
  cvBlobPathname: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-secondary-container text-on-secondary-container",
  REVIEWING: "bg-tertiary-container text-on-tertiary-container",
  SHORTLISTED: "bg-primary-container text-on-primary-container",
  REJECTED: "bg-error-container text-on-error-container",
  HIRED: "bg-secondary-container text-on-secondary-container",
  WITHDRAWN: "bg-surface-container-high text-on-surface-variant",
};

export function AdminApplicationsTable({ applications }: { applications: AdminApplicationRow[] }) {
  if (applications.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant rounded-lg border border-outline-variant p-8 text-center">
        No applications match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left text-body-md">
        <thead className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Job</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Applied</th>
            <th className="px-4 py-3">CV</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {applications.map((application) => (
            <tr key={application.id} className="hover:bg-surface-container-lowest">
              <td className="px-4 py-3">
                <Link href={`/admin/applications/${application.id}`} className="font-bold text-primary hover:underline">
                  {application.fullName}
                </Link>
                <p className="text-label-sm text-on-surface-variant">{application.email}</p>
              </td>
              <td className="px-4 py-3">{application.job.title}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-label-sm font-bold ${STATUS_STYLES[application.status]}`}
                >
                  {application.status}
                </span>
              </td>
              <td className="px-4 py-3 text-label-sm text-on-surface-variant">
                {application.createdAt.toLocaleDateString("en-GB")}
              </td>
              <td className="px-4 py-3">
                {application.cvBlobPathname ? (
                  <a
                    href={`/api/admin/applications/${application.id}/cv`}
                    className="text-label-sm text-primary font-bold hover:underline"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-label-sm text-on-surface-variant">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
