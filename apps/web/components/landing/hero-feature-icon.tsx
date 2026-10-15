import Image from "next/image";

export type HeroFeature = "camera" | "report" | "map";

/** Decorative artwork; the adjacent link text supplies its accessible name. */
export default function HeroFeatureIcon({ feature, className }: { feature: HeroFeature; className?: string }) {
  return <Image
    src={`/images/landing-hero/${feature}.webp`}
    alt=""
    aria-hidden="true"
    width={256}
    height={256}
    sizes="(max-width: 760px) 60px, (max-width: 1200px) 88px, 110px"
    className={className}
  />;
}
