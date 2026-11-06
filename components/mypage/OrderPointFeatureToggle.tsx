"use client";
import type { ComponentProps } from "react";
import { updateOrderPointFeature } from "@/app/mypage/menus/[menuId]/tables/actions";
import OrderPointFeatureControl from "./OrderPointFeatureControl";
export default function OrderPointFeatureToggle(props: Omit<ComponentProps<typeof OrderPointFeatureControl>, "onUpdate">) {
  return <OrderPointFeatureControl {...props} onUpdate={updateOrderPointFeature} />;
}
