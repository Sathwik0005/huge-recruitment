"use client";

import { useEffect, useRef, useState } from "react";

interface PartnershipModelCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function PartnershipModelCard({ icon, title, description }: PartnershipModelCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Devices without real hover (touch) don't get :hover feedback while
    // scrolling, so drive the same highlight off scroll position instead —
    // whichever card is nearest the viewport center lights up.
    if (window.matchMedia("(hover: hover)").matches) return;

    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cardState = active ? "shadow-xl -translate-y-1" : "hover:shadow-xl hover:-translate-y-1";
  const accentBar = active ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100";
  const overlay = active
    ? "from-primary/5 to-employer-accent/10"
    : "from-primary/0 to-employer-accent/0 group-hover:from-primary/5 group-hover:to-employer-accent/10";
  const iconTile = active
    ? "from-primary to-primary"
    : "from-primary/10 to-employer-accent/20 group-hover:from-primary group-hover:to-primary";
  const iconColor = active ? "text-on-primary" : "text-primary group-hover:text-on-primary";

  return (
    <div
      ref={ref}
      className={`group relative bg-surface rounded-xl border border-outline-variant/70 p-6 pl-7 h-full overflow-hidden shadow-sm transition-all duration-300 ${cardState}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 bg-linear-to-b from-primary to-employer-accent origin-top transition-transform duration-300 ease-out ${accentBar}`}
      />
      <div className={`absolute inset-0 bg-linear-to-br transition-colors duration-300 ${overlay}`} />
      <div className="relative">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 shadow-inner transition-all duration-300 bg-linear-to-br ${iconTile}`}
        >
          <span className={`material-symbols-outlined text-[22px] transition-colors duration-300 ${iconColor}`}>
            {icon}
          </span>
        </div>
        <h4 className="font-label-md text-label-md font-bold text-on-surface mb-1.5">{title}</h4>
        <p className="text-caption text-on-surface-variant leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
