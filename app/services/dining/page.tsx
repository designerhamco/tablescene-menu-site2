import { permanentRedirect } from "next/navigation";
import { SERVICE_HOME_HREFS } from "@/lib/service-home-navigation";

export default function ServiceIntroductionRedirect() {
  permanentRedirect(SERVICE_HOME_HREFS.dining);
}
