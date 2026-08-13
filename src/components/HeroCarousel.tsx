"use client";

import { useEffect, useState } from "react";

interface HeroSlide {
  src: string;
  alt: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://res.cloudinary.com/uhfrtle0/image/upload/v1786409190/hero_section_1.png",
    alt: "Placeholder hero image 1 — warehouse and logistics team",
  },
  {
    src: "https://res.cloudinary.com/uhfrtle0/image/upload/v1786409190/hero_section_2.png",
    alt: "Placeholder hero image 2 — manufacturing floor",
  },
  {
    src: "https://res.cloudinary.com/uhfrtle0/image/upload/v1786409190/hero_section_3.png",
    alt: "Placeholder hero image 3 — distribution and delivery",
  },
];

const ROTATE_INTERVAL_MS = 5000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {HERO_SLIDES.map((slide, slideIndex) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 w-full h-full object-cover object-[75%_center] md:object-center transition-opacity duration-1000 ease-in-out ${
            slideIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
