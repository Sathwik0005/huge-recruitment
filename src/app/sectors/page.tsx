import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectorRow from "./SectorRow";

export const metadata: Metadata = {
  title: "Our Sectors | Huge Requirements Limited",
  description:
    "A premier UK recruitment partner specializing in delivering excellence across core industrial sectors — warehousing, manufacturing, distribution, automotive, and production.",
};

interface SectorRowData {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon: string;
  tags: string[];
  highlights: string[];
}

const SECTOR_ROWS: SectorRowData[] = [
  {
    slug: "warehousing",
    eyebrow: "Logistics",
    title: "Warehousing",
    description:
      "Providing end-to-end staffing solutions for high-volume logistics hubs. We specialize in operational management, inventory control, and skilled fulfillment roles to keep your supply chain moving seamlessly.",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785158972/istockphoto-1125121546-2048x2048_ja5lnf.jpg",
    alt: "A professional warehouse facility",
    icon: "inventory_2",
    tags: ["Warehouse Managers", "Inventory Controllers", "Fulfillment Specialists"],
    highlights: [
      "Same-week deployment for urgent warehouse shifts",
      "Fully vetted, safety-certified operatives",
      "Coverage across day, night and weekend patterns",
      "A dedicated account manager for every site",
    ],
  },
  {
    slug: "manufacturing",
    eyebrow: "Industrial",
    title: "Manufacturing",
    description:
      "Driving efficiency in modern manufacturing through expert placement of technical specialists. From precision engineering to quality assurance, we source the talent that powers industrial innovation.",
    image:
      "https://media.istockphoto.com/id/2188581107/photo/worker-in-protective-gear-welding-metal-in-an-industrial-factory-setting-with-sparks-flying.jpg?s=2048x2048&w=is&k=20&c=BqLt67Fsb0H0ThXyNuFjylTrJw3D4hfCqpyYiuSEEBU=",
    alt: "Manufacturing components",
    icon: "precision_manufacturing",
    tags: ["Production Engineers", "Quality Assurance", "CNC Technicians"],
    highlights: [
      "Technical vetting for precision engineering roles",
      "Access to certified CNC and QA specialists",
      "Support across contract and permanent placements",
      "Compliance-first candidate screening",
    ],
  },
  {
    slug: "distribution",
    eyebrow: "Transport",
    title: "Distribution",
    description:
      "Connecting the supply chain with elite logistics and transportation talent across the UK. We ensure your distribution networks operate at peak capacity with reliable, certified professionals.",
    image:
      "https://media.istockphoto.com/id/2091314722/photo/aerial-view-rows-of-trucks-driving-in-harbor-with-trailers.jpg?s=2048x2048&w=is&k=20&c=IJhAgon8QnHs9Hl24q2riGKCt6B3JY-ZhVmg92LXqwk=",
    alt: "Distribution center",
    icon: "local_shipping",
    tags: ["Fleet Leads", "Supply Chain", "Route Planners"],
    highlights: [
      "Nationwide network of logistics and transport talent",
      "Certified HGV and fleet management specialists",
      "Rapid response for peak-season demand",
      "End-to-end supply chain coverage",
    ],
  },
  {
    slug: "automotive",
    eyebrow: "Mobility",
    title: "Automotive",
    description:
      "Specialized recruitment for the automotive lifecycle, from R&D to high-end assembly. We connect leading automotive brands with specialized engineers, technicians, and operational experts.",
    image:
      "https://media.istockphoto.com/id/1320950379/photo/3d-render-of-a-car-on-robotic-welding-line.jpg?s=2048x2048&w=is&k=20&c=lk5rIAzBqjs47kCacA9UNJ4-w4cS11UwIG_KL-jEqOs=",
    alt: "Automotive research facility",
    icon: "directions_car",
    tags: ["R&D Engineers", "Assembly Technicians", "Plant Leadership"],
    highlights: [
      "Specialists across R&D, assembly and plant leadership",
      "Deep understanding of automotive compliance standards",
      "Access to niche engineering talent pools",
      "Support for OEM and Tier 1 supplier requirements",
    ],
  },
  {
    slug: "production",
    eyebrow: "Operations",
    title: "Production",
    description:
      "Tailored workforce solutions for high-output production environments and technical lines. We provide skilled line workers, quality control operatives, and technical management to maintain continuous output.",
    image:
      "https://media.istockphoto.com/id/1204069369/photo/group-of-students-in-an-engineering-class-looking-at-the-teacher.jpg?s=2048x2048&w=is&k=20&c=32sby6950eelHjZ1yjICb4_h9k8X227r7Cs8vwFR8xs=",
    alt: "Production environment",
    icon: "factory",
    tags: ["Line Management", "Technical Operators", "Process Improvement"],
    highlights: [
      "Skilled line operatives ready for rapid deployment",
      "Process improvement and lean manufacturing expertise",
      "Flexible staffing for fluctuating production demand",
      "Rigorous safety and quality standards",
    ],
  },
];

export default function SectorsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 employer-hero-gradient opacity-90" />
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-employer-accent/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-secondary-container/20 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-24 md:py-28 text-center">
          <Reveal className="max-w-2xl mx-auto space-y-6">
            <span className="inline-block bg-amber-600 text-employer-on-accent px-3 py-1 text-label-md font-label-md uppercase tracking-widest rounded">
              Industries We Serve
            </span>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white leading-tight">
              Our Specialist Sectors
            </h1>
            <p className="font-body-lg text-body-lg text-white/80 max-w-xl mx-auto">
              A premier UK recruitment partner delivering excellence across core industrial
              sectors, connecting high-value candidates with the nation&apos;s leading enterprises.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="flex flex-col gap-0">
        {SECTOR_ROWS.map((sector, index) => (
          <SectorRow
            key={sector.title}
            id={sector.slug}
            index={index}
            eyebrow={sector.eyebrow}
            title={sector.title}
            description={sector.description}
            image={sector.image}
            alt={sector.alt}
            icon={sector.icon}
            tags={sector.tags}
            highlights={sector.highlights}
            reverse={index % 2 === 1}
            bgClassName={index % 2 === 0 ? "bg-surface-container-low" : "bg-surface-container-lowest"}
          />
        ))}
      </div>

      {/* Closing CTA */}
      <section className="py-xxl relative bg-surface-bright overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl"
        />
        <Reveal className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center relative z-10">
          <h2 className="text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">
            Can&apos;t See Your Sector?
          </h2>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12">
            Every industrial workforce challenge is different. Speak to our specialist team about
            bespoke recruitment solutions across any sector, or explore every live role today.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link
              href="/contact-us"
              className="bg-primary text-white px-12 py-6 rounded text-body-lg font-bold hover:opacity-90 hover:scale-105 transition-all"
            >
              Talk to Our Team
            </Link>
            <Link
              href="/jobs"
              className="border-2 border-primary text-primary px-12 py-6 rounded text-body-lg font-bold hover:bg-primary/5 hover:scale-105 transition-all"
            >
              Browse All Jobs
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
