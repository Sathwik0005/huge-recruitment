import Link from "next/link";
import { getSimilarJobs, type PublicJob } from "@/lib/job-dto";
import { JobCard } from "../JobCard";

export async function SimilarJobs({ job }: { job: Pick<PublicJob, "id" | "sector"> }) {
  const similarJobs = await getSimilarJobs(job);
  if (similarJobs.length === 0) return null;

  return (
    <section className="mt-12 border-t border-outline-variant pt-8" aria-labelledby="similar-jobs-heading">
      <div className="mb-5 flex items-center justify-between">
        <h2 id="similar-jobs-heading" className="font-headline-lg text-[26px] text-primary">
          Similar jobs
        </h2>
        <Link href="/jobs" className="inline-flex items-center gap-1 font-semibold text-primary hover:text-secondary">
          View all jobs
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {similarJobs.map((similar) => (
          <JobCard key={similar.id} job={similar} />
        ))}
      </div>
    </section>
  );
}
