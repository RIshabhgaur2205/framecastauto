import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Results } from "@/components/landing/Results";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import heroPoster from "@/assets/hero-poster.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Framecast — Automated YouTube channels, powered by AI" },
      {
        name: "description",
        content:
          "Framecast turns your niche into a fully automated YouTube channel. AI writes the script, generates the voiceover and visuals, and publishes on your schedule.",
      },
      {
        property: "og:title",
        content: "Framecast — Automated YouTube channels, powered by AI",
      },
      {
        property: "og:description",
        content:
          "Pick a niche. Framecast handles script, voice, visuals, captions, and publishing — automatically.",
      },
      { property: "og:image", content: heroPoster },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroPoster },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      <Nav />
      <Hero />
      <HowItWorks />
      <Results />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </main>
  );
}
