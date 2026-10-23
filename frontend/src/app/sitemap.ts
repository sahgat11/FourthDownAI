import type { MetadataRoute } from "next";
import { meta } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(meta.generated_at);
  return ["", "/projections", "/breakouts", "/waivers"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "daily",
  }));
}
