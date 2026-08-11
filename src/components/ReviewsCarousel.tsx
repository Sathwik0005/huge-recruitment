"use client";

import { useCallback, useEffect, useState } from "react";

interface Review {
  quote: string;
  name: string;
  role: string;
  image: string;
}

const REVIEWS: Review[] = [
  {
    quote:
      "Huge Requirements found me a role that actually matched my skills within two weeks. The whole process felt personal, not transactional.",
    name: "John Smith",
    role: "Software Engineer • Successfully Placed",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785158545/istockphoto-613560020-612x612_vxtsxo.jpg",
  },
  {
    quote:
      "As an employer, the quality of candidates we received was consistently high. They understood our technical requirements from the first call.",
    name: "Amara Okafor",
    role: "Head of Operations, Vertex Logistics",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785158778/workers-weld-car-body-details-welding-shop-automobile-en-enterprise-industry-50670085_gwkwh7.webp",
  },
  {
    quote:
      "I was nervous about switching industries, but my recruiter coached me through every interview. Couldn't have landed the offer without them.",
    name: "Priya Nair",
    role: "Plant Director • Successfully Placed",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785029248/apart_iw2ejv.jpg",
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
          <div className="overflow-hidden rounded-lg shadow-2xl border-4 border-white">
            <img
              key={review.image}
              src={review.image}
              alt={review.name}
              className="w-full h-[220px] lg:h-[280px] object-cover animate-[fade-in_0.5s_ease-out]"
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
