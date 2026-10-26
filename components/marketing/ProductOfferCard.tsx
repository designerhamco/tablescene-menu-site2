import Link from "next/link";
import { OfferCard } from "@/app/components/ui/offer-card";
import { buttonVariants } from "@/app/components/ui/button";
import { formatProductPrice, type PublicBasicProduct } from "@/lib/public-product-details";

export default function ProductOfferCard({ product }: { product: PublicBasicProduct }) {
  const service=product.standardDesignId.startsWith("basic") ? "basic" : "dining";
  const name=service === "basic" ? "베이직" : "다이닝";
  return <OfferCard label={`${name} 디자인 이용권 선택`} options={[
    {id:"standard",label:"기본 디자인",price:`월 ${formatProductPrice(product.price)}`,priceNote:`얼리버드 · 정상가 월 ${formatProductPrice(product.regularPrice)} · 부가세 포함`,title:`${name} 기본 디자인`,description:product.summary,features:[{label:"구독 단위",value:"메뉴판 1개"},{label:"디자인 교체",value:"기본 디자인끼리"},{label:"결제 방식",value:product.billingLabel}],actions:<><Link href={`/products/${product.slug}`} className={buttonVariants({variant:"outline",size:"lg",shape:"rounded"})}>상품 상세 보기</Link><Link href={`/templates?plan=${service}&category=standard`} className={buttonVariants({size:"lg",shape:"rounded"})}>기본 디자인 선택</Link></>},
    {id:"all",label:"디자인 포함",price:`월 ${formatProductPrice(product.designPrice)}`,priceNote:`얼리버드 · 정상가 월 ${formatProductPrice(product.designRegularPrice)} · 부가세 포함`,title:`${name} 디자인 포함 이용권`,description:`${name} 메뉴판 1개를 구독하며 완성된 디자인 템플릿과 기본 디자인을 함께 이용합니다.`,features:[{label:"구독 단위",value:"메뉴판 1개"},{label:"디자인 교체",value:"기본·디자인 템플릿"},{label:"결제 방식",value:product.billingLabel}],actions:<><Link href={`/products/${product.slug}`} className={buttonVariants({variant:"outline",size:"lg",shape:"rounded"})}>상품 상세 보기</Link><Link href={`/templates?plan=${service}&category=designer`} className={buttonVariants({size:"lg",shape:"rounded"})}>디자인 템플릿 선택</Link></>},
  ]} note={<><p>계정당 최초 1회 30일 무료체험을 제공합니다. 사업자 확인과 결제수단 등록 후 이용할 수 있습니다.</p><p>자동결제·해지·환불 조건은 상품 상세에서 확인하세요.</p></>} />;
}
