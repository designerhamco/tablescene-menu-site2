import type { HomeService } from "@/lib/service-home-navigation";

const serviceNames: Record<HomeService, string> = {
  basic: "Basic",
  dining: "Dining",
  display: "Display",
};

export default function ServiceFrameLabel({ service }: { service: HomeService }) {
  return <p className="type-caption" lang="en" data-service-frame-label>{serviceNames[service]}</p>;
}
