import Image from "next/image";
import styles from "./brand-logo.module.css";
import { BRAND } from "../lib/brand";

export default function BrandLogo({ className = "", width }: { className?: string; width?: number }) {
  return <span className={`${styles.frame} ${className}`} style={width ? { width } : undefined} aria-hidden="true">
    <Image className={styles.art} src={BRAND.logo.src} alt="" width={BRAND.logo.width} height={BRAND.logo.height} sizes={`${width ?? 220}px`} priority />
  </span>;
}
