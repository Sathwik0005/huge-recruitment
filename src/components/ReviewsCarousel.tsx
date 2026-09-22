"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

interface Review {
  quote: string;
  name: string;
  role: string;
  image: string;
}

const REVIEWS: Review[] = [
  {
    quote:
      "I'd been out of work for a while and was starting to lose hope. My recruiter got me onto an automotive production line within days and checked in with me through the whole first week.",
    name: "James Carter",
    role: "Production Operative • Successfully Placed",
    image:
      "https://res.cloudinary.com/uhfrtle0/image/upload/v1790079184/review_section_1.jpg",
  },
  {
    quote:
      "The team took the time to understand what shifts actually worked for me before sending my CV anywhere. Got offered a warehouse role that fit my schedule perfectly.",
    name: "Daniel Brooks",
    role: "Warehouse Operative • Successfully Placed",
    image:
      "https://res.cloudinary.com/uhfrtle0/image/upload/v1790079511/review_section_2.jpg",
  },
  {
    quote:
      "Moving to a new city for work was daunting, but they lined up interviews before I'd even arrived in Manchester. I started my new logistics role the same week I moved.",
    name: "Sophie Bennett",
    role: "Logistics Assistant • Successfully Placed",
    image:
      "https://res.cloudinary.com/uhfrtle0/image/upload/v1790080031/review_section_3.jpg",
  },
];

export default function ReviewsCarousel() {
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    setIndex((i + REVIEWS.length) % REVIEWS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const review = REVIEWS[index];

  return (
    <div className="relative mx-0 lg:ml-28 bg-[#1E88D8] rounded-lg shadow-2xl p-6 lg:p-12">
      <div className="grid lg:grid-cols-[320px_1fr] items-center gap-6 lg:gap-10">
        <div className="relative lg:-ml-40 z-20">
          <div className="relative h-[220px] lg:h-[280px] w-full overflow-hidden rounded-lg shadow-2xl border-4 border-white">
            <Image
              key={review.image}
              src={review.image}
              alt={review.name}
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover animate-[fade-in_0.5s_ease-out]"
            />
          </div>
        </div>

        <div className="text-white" key={index}>
          <div className="mb-6">
            <svg
              className="w-12 h-12 text-white/30"
              fill="currentColor"
              viewBox="0 0 32 32"
            >
              <path d="M10 8C5.5 8 2 11.5 2 16v8h10v-8H8c0-2.2 1.8-4 4-4V8H10zm16 0c-4.5 0-8 3.5-8 8v8h10v-8h-4c0-2.2 1.8-4 4-4V8h-2z" />
            </svg>
          </div>

          <p className="text-lg lg:text-xl leading-relaxed font-light animate-[fade-in-up_0.5s_ease-out]">
            {review.quote}
          </p>

          <div className="mt-8">
            <h4 className="text-2xl font-bold">{review.name}</h4>
            <p className="text-white/80 mt-1">{review.role}</p>
          </div>

          <div className="flex gap-3 mt-8">
            {REVIEWS.map((r, i) => (
              <button
                key={r.name}
                type="button"
                aria-label={`Go to review ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-3 rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-3 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
