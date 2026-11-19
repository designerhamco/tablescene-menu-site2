import { MARKETING_SERVICE_FEATURES } from "@/lib/marketing-service-features";
import ServiceFeatureGallery from "./ServiceFeatureGallery";

export default function BasicServiceStory() {
  return <ServiceFeatureGallery service="basic" title={<>베이직, 한 장에 담는<br/>우리 매장의 메뉴판.</>} description="시그니처부터 오늘의 혜택, 테이블 주문까지. 필요한 기능을 골라 매장에 맞는 메뉴판을 완성하세요." features={MARKETING_SERVICE_FEATURES.basic}/>;
}
