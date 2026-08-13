"use client";

import { useEffect, useRef, useState } from "react";

interface SectorRowProps {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon: string;
  tags: string[];
  highlights: string[];
  reverse?: boolean;
  bgClassName: string;
}

export default function SectorRow({
  id,
  index,
  eyebrow,
  title,
  description,
  image,
  alt,
  icon,
  tags,
  highlights,
  reverse = false,
  bgClassName,
}: SectorRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const boxDirectionClass = reverse ? "sector-box-right" : "sector-box-left";
  const imageDirectionClass = reverse ? "sector-image-bottom" : "sector-image-top";

  const dark = index % 2 === 1;
  const chipClass = dark
    ? "bg-tertiary-container text-on-tertiary-container"
    : "bg-secondary-container text-on-secondary-container";
  const iconRingClass = dark
    ? "bg-tertiary-container text-on-tertiary-container"
    : "bg-secondary-container text-on-secondary-container";
  const panelClass = dark ? "bg-tertiary-container/80" : "bg-secondary-container/80";
  const blobClass = dark ? "bg-tertiary/20" : "bg-secondary/20";
  const tagClass = dark
    ? "border-tertiary-container/60 text-on-surface-variant bg-surface-container-lowest"
    : "border-secondary-container/70 text-on-surface-variant bg-surface-container-lowest";

  const orderLabel = `0${index + 1}`;

  return (
    <section
      id={id}
      ref={ref}
      className={`relative overflow-hidden py-20 md:py-28 px-margin-mobile md:px-margin-desktop scroll-mt-20 ${bgClassName}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 ${
          reverse ? "-left-24" : "-right-24"
        } w-105 h-105 rounded-full blur-3xl ${blobClass}`}
      />

      <div
        className={`relative max-w-container-max mx-auto flex flex-col ${
          reverse ? "md:flex-row-reverse" : "md:flex-row"
        } items-center gap-gutter md:gap-16`}
      >
        <div
          className={`relative flex-1 space-y-6 ${reverse ? "md:pl-8" : "md:pr-8"} sector-box ${boxDirectionClass} ${
            visible ? "sector-box-in" : ""
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute -top-10 md:-top-14 ${
              reverse ? "right-0" : "left-0"
            } font-headline-lg text-[90px] md:text-[128px] font-black leading-none text-primary/6 select-none`}
          >
            {orderLabel}
          </span>

          <div className="relative flex items-center gap-3">
            <span className="h-px w-10 bg-primary/30" />
            <span className="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em] uppercase">
              Sector {orderLabel}
            </span>
          </div>

          <div className="relative flex items-center gap-4">
            <span className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${iconRingClass}`}>
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </span>
            <span
              className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full font-label-sm text-label-sm uppercase tracking-wider ${chipClass}`}
            >
              {eyebrow}
            </span>
          </div>

          <h2 className="relative font-headline-lg text-headline-lg md:text-[40px] md:leading-[1.15] text-primary">
            {title}
          </h2>
          <p className="relative font-body-md text-body-md text-on-surface-variant max-w-lg">{description}</p>

          {tags.length > 0 && (
            <div className="relative flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-3 py-1.5 rounded-full border font-label-sm text-label-sm ${tagClass}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {highlights.length > 0 && (
            <ul className="relative space-y-3 pt-2">
              {highlights.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${iconRingClass}`}
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant">{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative flex-1 w-full">
          <div
            aria-hidden="true"
            className={`hidden md:block absolute w-full h-full rounded-xl ${panelClass} ${
              reverse ? "-right-6 -bottom-6" : "-left-6 -bottom-6"
            }`}
          />

          <div
            className={`relative z-10 w-full h-100 rounded-xl overflow-hidden shadow-lg border border-outline-variant sector-image ${imageDirectionClass} ${
              visible ? "sector-image-in" : ""
            }`}
          >
            <img
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
              src={image}
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
