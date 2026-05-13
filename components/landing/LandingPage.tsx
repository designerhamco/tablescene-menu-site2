import { AllInOneFlow } from "./AllInOneFlow";
import { DeviceSelection } from "./DeviceSelection";
import { FAQ } from "./FAQ";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Navbar } from "./Navbar";
import { NavigationDots } from "./NavigationDots";
import { Portfolio } from "./Portfolio";
import { Pricing } from "./Pricing";
import { Services } from "./Services";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <NavigationDots />
      <main className="relative">
        <Hero />
        <Services />
        <AllInOneFlow />
        <DeviceSelection />
        <Pricing />
        <Portfolio />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
