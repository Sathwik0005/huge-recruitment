import "server-only";
import { prisma } from "@/lib/prisma";

const LOOKBACK_DAYS = 7;
const MAX_ITEMS = 10;
const UNREAD_WINDOW_HOURS = 24;

export type AdminNotification = {
  id: string;
  message: string;
  href: string;
  createdAt: Date;
};

/**
 * Recent-activity feed derived from existing tables — there is no dedicated
 * Notification model. "Unread" is a time-window heuristic (created within
 * the last `UNREAD_WINDOW_HOURS`), not a stored read/unread flag.
 */
export async function getAdminNotifications(): Promise<{ items: AdminNotification[]; unreadCount: number }> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

  const [applications, submittedProfiles] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_ITEMS,
      select: { id: true, fullName: true, createdAt: true, job: { select: { title: true } } },
    }),
    prisma.candidateProfile.findMany({
      where: { step3CompletedAt: { gte: since } },
      orderBy: { step3CompletedAt: "desc" },
      take: MAX_ITEMS,
      select: { userId: true, step3CompletedAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const items: AdminNotification[] = [
    ...applications.map((application) => ({
      id: `application-${application.id}`,
      message: `${application.fullName} applied for ${application.job.title}`,
      href: `/admin/candidates/${application.id}`,
      createdAt: application.createdAt,
    })),
    ...submittedProfiles.map((profile) => ({
      id: `profile-${profile.userId}`,
      message: `${profile.user.firstName} ${profile.user.lastName} submitted their candidate profile`,
      href: `/admin/candidate-profiles/${profile.userId}`,
      createdAt: profile.step3CompletedAt!,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_ITEMS);

  const unreadSince = Date.now() - UNREAD_WINDOW_HOURS * 3_600_000;
  const unreadCount = items.filter((item) => item.createdAt.getTime() >= unreadSince).length;

  return { items, unreadCount };
}
