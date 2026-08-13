import Link from "next/link";
import HeroCarousel from "@/components/HeroCarousel";
import Reveal from "@/components/Reveal";
import ReviewsCarousel from "@/components/ReviewsCarousel";
import HeroSearch from "./HeroSearch";

const VACANCIES = [
  {
    type: "Full Time",
    pay: "£45k - £55k",
    title: "Senior Operations Manager",
    location: "Birmingham, UK",
    tags: ["Logistics", "Leadership"],
  },
  {
    type: "Contract",
    pay: "£350 - £400/day",
    title: "Compliance Specialist",
    location: "Manchester, UK",
    tags: ["Legal", "Audit"],
  },
  {
    type: "Permanent",
    pay: "£60k - £75k",
    title: "Plant Director",
    location: "Coventry, UK",
    tags: ["Automotive", "Executive"],
  },
];

type SectorVariant = "featured" | "overlay" | "light";

interface SectorFeature {
  icon: string;
  label: string;
}

interface Sector {
  title: string;
  description: string;
  image: string;
  alt: string;
  colSpan: string;
  height: string;
  variant: SectorVariant;
  badge?: string;
  tags?: string[];
  tagsRounded?: "chip" | "full";
  features?: SectorFeature[];
  cta?: string;
}

const SECTORS: Sector[] = [
  {
    title: "Warehousing",
    description:
      "Providing end-to-end staffing solutions for high-volume logistics hubs. We specialize in operational management, inventory control, and skilled fulfillment roles.",
    image:
      "https://res.cloudinary.com/dgz2omokl/image/upload/v1785158972/istockphoto-1125121546-2048x2048_ja5lnf.jpg",
    alt: "A professional warehouse facility",
    colSpan: "md:col-span-8",
    height: "h-[400px]",
    variant: "featured",
    tags: [
      "Warehouse Managers",
      "Inventory Controllers",
      "Fulfillment Specialists",
    ],
    tagsRounded: "chip",
  },
  {
    title: "Manufacturing",
    description:
      "Driving efficiency in modern manufacturing through expert placement of technical specialists.",
    image:
      "https://media.istockphoto.com/id/2188581107/photo/worker-in-protective-gear-welding-metal-in-an-industrial-factory-setting-with-sparks-flying.jpg?s=2048x2048&w=is&k=20&c=BqLt67Fsb0H0ThXyNuFjylTrJw3D4hfCqpyYiuSEEBU=",
    alt: "Manufacturing components",
    colSpan: "md:col-span-4",
    height: "h-[400px]",
    variant: "overlay",
    features: [
      { icon: "check_circle", label: "Production Engineers" },
      { icon: "check_circle", label: "Quality Assurance" },
      { icon: "check_circle", label: "CNC Technicians" },
    ],
  },
  {
    title: "Distribution",
    description:
      "Connecting the supply chain with elite logistics and transportation talent across the UK.",
    image:
      "https://media.istockphoto.com/id/2091314722/photo/aerial-view-rows-of-trucks-driving-in-harbor-with-trailers.jpg?s=2048x2048&w=is&k=20&c=IJhAgon8QnHs9Hl24q2riGKCt6B3JY-ZhVmg92LXqwk=",
    alt: "Distribution center",
    colSpan: "md:col-span-4",
    height: "h-[450px]",
    variant: "overlay",
    tags: ["Fleet Leads", "Supply Chain"],
    tagsRounded: "full",
  },
  {
    title: "Automotive",
    description:
      "Specialized recruitment for the automotive lifecycle, from R&D to high-end assembly.",
    image:
      "https://media.istockphoto.com/id/1320950379/photo/3d-render-of-a-car-on-robotic-welding-line.jpg?s=2048x2048&w=is&k=20&c=lk5rIAzBqjs47kCacA9UNJ4-w4cS11UwIG_KL-jEqOs=",
    alt: "Automotive research facility",
    colSpan: "md:col-span-4",
    height: "h-[450px]",
    variant: "light",
    cta: "Explore Roles",
  },
  {
    title: "Production",
    description:
      "Tailored workforce solutions for high-output production environments and technical lines.",
    image:
      "https://media.istockphoto.com/id/1204069369/photo/group-of-students-in-an-engineering-class-looking-at-the-teacher.jpg?s=2048x2048&w=is&k=20&c=32sby6950eelHjZ1yjICb4_h9k8X227r7Cs8vwFR8xs=",
    alt: "Production environment",
    colSpan: "md:col-span-4",
    height: "h-[450px]",
    variant: "overlay",
    features: [
      { icon: "bolt", label: "Line Management" },
      { icon: "bolt", label: "Technical Operators" },
    ],
  },
];

const DIFFERENTIATORS = [
  {
    icon: "award_star",
    title: "Industry Leading Service",
    description:
      "Bespoke account management tailored to your specific industrial requirements and KPIs.",
  },
  {
    icon: "school",
    title: "Dedicated Training",
    description:
      "In-house training facilities ensuring all candidates meet the highest safety and skill standards.",
  },
  {
    icon: "policy",
    title: "Compliance Support",
    description:
      "Rigorous audit processes and full legal compliance across all candidate placements.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[640px] flex items-center overflow-hidden">
        <HeroCarousel />
        <div className="absolute inset-0 z-1 bg-black/30" />
        <div className="relative z-20 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop w-full text-white">
          <div className="max-w-2xl hero-fade-in">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-4 leading-tight text-white">
              Empowering Growth Through Strategic Talent
            </h1>
            <p className="text-body-lg mb-12 opacity-90">
              Partnering with the UK&apos;s leading industrial sectors to
              provide executive-level recruitment solutions with precision and
              integrity.
            </p>
            <HeroSearch />
          </div>
        </div>
      </section>

      <section className="py-xxl bg-white">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="relative">
              <img
                src="https://res.cloudinary.com/uhfrtle0/image/upload/v1786410327/office.jpg"
                alt="Recruitment Team"
                className="w-full h-auto rounded-xl object-cover shadow-lg"
              />
            </Reveal>

            <Reveal delay={150}>
              <span className="text-sm uppercase tracking-[0.2em] text-blue-500 font-medium">
                BUILT FOR YOUR CAREER
              </span>

              <h2 className="mt-4 text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Your Next Career Move Starts Here
              </h2>

              <p className="mt-8 text-lg leading-9 text-gray-600">
                Partner with one of the UK’s trusted recruitment specialists,
                connecting skilled candidates with top employers across
                warehousing, logistics, manufacturing, distribution, and
                automotive sectors. We provide access to exclusive roles that
                match your experience and career goals.
              </p>

            </Reveal>
          </div>
        </div>
      </section>

      <section className="relative w-full pt-0 pb-xxl overflow-hidden bg-white">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <Reveal className="relative max-w-6xl mx-auto">
            <ReviewsCarousel />
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden pt-xxl pb-xxl">
        <Reveal className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Our Sectors
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            A premier UK recruitment partner specializing in delivering
            excellence across core industrial sectors. We connect high-value
            candidates with the nation&apos;s leading enterprises.
          </p>
        </Reveal>
      </section>
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-0 pb-xxl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {SECTORS.map((sector, sectorIndex) => (
            <Reveal
              key={sector.title}
              delay={sectorIndex * 100}
              className={`${sector.colSpan} group relative overflow-hidden rounded-lg bg-white border border-outline-variant cursor-pointer`}
            >
              <div className={`${sector.height} w-full overflow-hidden`}>
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={sector.alt}
                  src={sector.image}
                />
              </div>

              {sector.variant === "light" ? (
                <>
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-all" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-white">
                    <h2 className="font-headline-md text-headline-md text-primary mb-2">
                      {sector.title}
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                      {sector.description}
                    </p>
                    <button className="text-primary font-label-md flex items-center gap-1 hover:gap-4 transition-all">
                      {sector.cta}{" "}
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end ${
                    sector.variant === "featured" ? "p-6 md:p-12" : "p-6"
                  }`}
                >
                  <h2
                    className={
                      sector.variant === "featured"
                        ? "font-headline-lg text-headline-lg text-on-primary mb-2"
                        : "font-headline-md text-headline-md text-on-primary mb-2"
                    }
                  >
                    {sector.title}
                  </h2>
                  <p
                    className={`font-body-md text-body-md text-white/80 mb-4 ${
                      sector.variant === "featured" ? "max-w-xl" : ""
                    }`}
                  >
                    {sector.description}
                  </p>
                  {sector.tags && (
                    <div className="flex flex-wrap gap-2">
                      {sector.tags.map((tag) => (
                        <span
                          key={tag}
                          className={
                            sector.tagsRounded === "full"
                              ? "px-2 py-1 bg-white/20 text-white text-caption rounded-full"
                              : "px-2 py-1 bg-white/10 backdrop-blur-md text-white text-caption rounded"
                          }
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {sector.features && (
                    <ul className="text-white/80 font-caption space-y-1">
                      {sector.features.map((feature) => (
                        <li
                          key={feature.label}
                          className="flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {feature.icon}
                          </span>{" "}
                          {feature.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>
      <section className="pt-0 pb-xxl">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
            <h2 className="text-headline-lg font-headline-lg text-primary">
              Featured Opportunities
            </h2>
            <Link
              className="text-primary font-bold border-b-2 border-primary pb-1 w-fit"
              href="/jobs"
            >
              View All Openings
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {VACANCIES.map((job, jobIndex) => (
              <Reveal
                key={job.title}
                delay={jobIndex * 100}
                className="bg-surface-container-lowest p-6 border border-outline rounded hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-secondary-container text-primary text-caption px-2 py-1 rounded">
                    {job.type}
                  </span>
                  <span className="text-primary font-bold">{job.pay}</span>
                </div>
                <h3 className="text-title-lg font-bold text-primary mb-1">
                  {job.title}
                </h3>
                <p className="text-on-surface-variant flex items-center gap-1 mb-4">
                  <span className="material-symbols-outlined text-sm">
                    location_on
                  </span>{" "}
                  {job.location}
                </p>
                <div className="flex gap-1 flex-wrap mb-6">
                  {job.tags.map((tag) => (
                    <span


                      key={tag}
                      className="text-caption bg-surface-container px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="w-full border border-primary text-primary font-bold py-2 rounded hover:bg-primary hover:text-white transition-all">
                  Apply Now
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>


      {/* What Sets Us Apart */}
      <section className="pt-0 pb-xxl bg-primary text-white">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <Reveal>
              <h2 className="text-display-lg-mobile md:text-display-lg font-bold mb-6 leading-tight text-white">
                What Sets Us Apart
              </h2>
              <div className="space-y-12">
                {DIFFERENTIATORS.map((item, itemIndex) => (
                  <Reveal
                    key={item.title}
                    delay={itemIndex * 120}
                    className="flex gap-6"
                  >
                    <div className="bg-white/10 w-16 h-16 shrink-0 rounded flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-secondary-container">
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-title-lg font-bold mb-1 text-white">
                        {item.title}
                      </h4>
                      <p className="opacity-70">{item.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>
            <Reveal delay={150} className="relative hidden md:block">
              <div className="aspect-square rounded-xl overflow-hidden shadow-2xl">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://res.cloudinary.com/uhfrtle0/image/upload/v1786584926/sets_us_apart.webp')",
                  }}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-xxl pb-xxl relative bg-surface-bright overflow-hidden">
        <Reveal className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center relative z-10">
          <h2 className="text-display-lg-mobile md:text-display-lg font-bold text-primary mb-4">
            Scale Your Future
          </h2>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12">
            Whether you&apos;re looking to build an elite team or take the next
            step in your professional career, Huge Requirements Limited is your
            strategic partner.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <a
              href="/employers"
              className="bg-primary text-white px-12 py-6 rounded text-body-lg font-bold hover:opacity-90 hover:scale-105 transition-all"
            >
              I&apos;m Hiring Talent
            </a>
            <Link
              href="/jobs"
              className="border-2 border-primary text-primary px-12 py-6 rounded text-body-lg font-bold hover:bg-primary/5 hover:scale-105 transition-all"
            >
              I&apos;m Finding a Job
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
