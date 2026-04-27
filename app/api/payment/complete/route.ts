import { NextResponse } from "next/server";

import {
  isTemplateKey,
  isValidMenuSlug,
  menuCreationProduct,
  normalizeMenuSlug,
  type MenuOrderPayload,
} from "@/lib/payments";
import { requirePortOneApiSecret } from "@/lib/portone";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type CompletePaymentRequest = {
  paymentId?: unknown;
  template_key?: unknown;
  orderPayload?: unknown;
};

type PortOnePayment = {
  id?: string;
  paymentId?: string;
  status?: string;
  orderName?: string;
  currency?: string;
  amount?: number | {
    total?: number;
    paid?: number;
  };
  paidAmount?: number;
  customData?: Record<string, unknown>;
};

type VerifiedPayment = {
  id: string;
  amount: number;
  status: "PAID";
  raw: PortOnePayment;
};

type MenuSiteResult = {
  id: string;
  slug: string;
};

type OrderResult = {
  id: string;
};

type PaymentResult = {
  id: string;
};

type LooseInsert = Record<string, unknown>;

function getPaymentAmount(payment: PortOnePayment) {
  if (typeof payment.amount === "number") {
    return payment.amount;
  }

  if (typeof payment.amount?.total === "number") {
    return payment.amount.total;
  }

  if (typeof payment.amount?.paid === "number") {
    return payment.amount.paid;
  }

  if (typeof payment.paidAmount === "number") {
    return payment.paidAmount;
  }

  return null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const stringValue = getString(value);
  return stringValue || null;
}

function parseOrderPayload(value: unknown): MenuOrderPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const templateKey = getString(payload.template_key);
  const desiredSlug = normalizeMenuSlug(getString(payload.desiredSlug));
  const amount = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);

  if (!isTemplateKey(templateKey) || !isValidMenuSlug(desiredSlug) || amount !== menuCreationProduct.amount) {
    return null;
  }

  const parsedPayload: MenuOrderPayload = {
    template_key: templateKey,
    menuName: getString(payload.menuName),
    desiredSlug,
    restaurantName: getString(payload.restaurantName),
    restaurantCategory: getString(payload.restaurantCategory),
    restaurantAddress: getString(payload.restaurantAddress),
    restaurantPhone: getString(payload.restaurantPhone),
    instagramUrl: getNullableString(payload.instagramUrl),
    notes: getNullableString(payload.notes),
    buyerName: getString(payload.buyerName),
    buyerPhone: getString(payload.buyerPhone),
    buyerEmail: getString(payload.buyerEmail),
    businessName: getNullableString(payload.businessName),
    businessNumber: getNullableString(payload.businessNumber),
    amount,
  };

  const requiredFields = [
    parsedPayload.menuName,
    parsedPayload.restaurantName,
    parsedPayload.restaurantCategory,
    parsedPayload.restaurantAddress,
    parsedPayload.restaurantPhone,
    parsedPayload.buyerName,
    parsedPayload.buyerPhone,
    parsedPayload.buyerEmail,
  ];

  if (requiredFields.some((field) => !field)) {
    return null;
  }

  return parsedPayload;
}

async function findExistingMenuForPayment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
) {
  const { data: existingOrder, error } = await supabase
    .from("orders")
    .select("id, menu_site_id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error || !existingOrder?.menu_site_id) {
    return null;
  }

  const { data: existingSite } = await supabase
    .from("menu_sites")
    .select("id, slug")
    .eq("id", existingOrder.menu_site_id)
    .maybeSingle();

  if (!existingSite) {
    return null;
  }

  return {
    orderId: existingOrder.id,
    menuSiteId: existingSite.id,
    slug: existingSite.slug,
  };
}

async function findExistingPaymentRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function createMenuSiteWithSamples(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderPayload: MenuOrderPayload
) {
  const menuSiteInsert: Database["public"]["Tables"]["menu_sites"]["Insert"] = {
    user_id: userId,
    name: orderPayload.menuName,
    slug: orderPayload.desiredSlug,
    template_key: orderPayload.template_key,
    status: "draft",
    restaurant_name: orderPayload.restaurantName,
    restaurant_category: orderPayload.restaurantCategory,
    restaurant_address: orderPayload.restaurantAddress,
    restaurant_phone: orderPayload.restaurantPhone,
    business_name: orderPayload.businessName,
    instagram_url: orderPayload.instagramUrl,
    notes: orderPayload.notes,
    settings: {
      source: "payment_complete",
      buyer_email: orderPayload.buyerEmail,
    },
  };

  let { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .insert(menuSiteInsert)
    .select("id, slug")
    .single();

  if (menuSiteError) {
    const minimalMenuSiteInsert: LooseInsert = {
      user_id: userId,
      name: orderPayload.menuName,
      slug: orderPayload.desiredSlug,
      template_key: orderPayload.template_key,
      status: "draft",
      restaurant_name: orderPayload.restaurantName,
      restaurant_category: orderPayload.restaurantCategory,
      restaurant_address: orderPayload.restaurantAddress,
      restaurant_phone: orderPayload.restaurantPhone,
      instagram_url: orderPayload.instagramUrl,
      notes: orderPayload.notes,
    };
    const fallbackResult = await supabase
      .from("menu_sites")
      .insert(minimalMenuSiteInsert as never)
      .select("id, slug")
      .single();

    menuSite = fallbackResult.data;
    menuSiteError = fallbackResult.error;

    if (menuSiteError) {
      throw new Error(`메뉴판 생성에 실패했습니다: ${menuSiteError.message}`);
    }
  }

  const createdMenuSite = menuSite as MenuSiteResult;

  const categoryInserts: Database["public"]["Tables"]["menu_categories"]["Insert"][] = [
    {
      menu_site_id: createdMenuSite.id,
      name: "대표 메뉴",
      description: "가장 먼저 보여줄 대표 메뉴를 등록하세요.",
      sort_order: 1,
      visible: true,
    },
    {
      menu_site_id: createdMenuSite.id,
      name: "식사",
      description: "식사 메뉴를 등록하세요.",
      sort_order: 2,
      visible: true,
    },
    {
      menu_site_id: createdMenuSite.id,
      name: "음료",
      description: "음료 또는 페어링 메뉴를 등록하세요.",
      sort_order: 3,
      visible: true,
    },
  ];

  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .insert(categoryInserts)
    .select("id, name");

  if (categoriesError) {
    throw new Error(`기본 카테고리 생성에 실패했습니다: ${categoriesError.message}`);
  }

  const mainCategoryId = categories?.find((category) => category.name === "대표 메뉴")?.id ?? null;
  const mealCategoryId = categories?.find((category) => category.name === "식사")?.id ?? mainCategoryId;
  const drinkCategoryId = categories?.find((category) => category.name === "음료")?.id ?? mainCategoryId;
  const itemInserts: Database["public"]["Tables"]["menu_items"]["Insert"][] = [
    {
      menu_site_id: createdMenuSite.id,
      category_id: mainCategoryId,
      name: "대표 메뉴 샘플",
      description: "마이페이지에서 실제 메뉴명과 설명으로 수정하세요.",
      price: 19000,
      badge: "BEST",
      is_best: true,
      visible: true,
      sort_order: 1,
    },
    {
      menu_site_id: createdMenuSite.id,
      category_id: mealCategoryId,
      name: "식사 메뉴 샘플",
      description: "식사 메뉴 예시입니다. 실제 메뉴로 교체하세요.",
      price: 16000,
      visible: true,
      sort_order: 2,
    },
    {
      menu_site_id: createdMenuSite.id,
      category_id: drinkCategoryId,
      name: "음료 샘플",
      description: "음료 메뉴 예시입니다.",
      price: 7000,
      visible: true,
      sort_order: 3,
    },
  ];

  const { error: itemsError } = await supabase.from("menu_items").insert(itemInserts);

  if (itemsError) {
    const minimalItemInserts: LooseInsert[] = [
      {
        menu_site_id: createdMenuSite.id,
        category_id: mainCategoryId,
        name: "대표 메뉴 샘플",
        description: "마이페이지에서 실제 메뉴명과 설명으로 수정하세요.",
        price: 19000,
        recommended: true,
        visible: true,
        sort_order: 1,
      },
      {
        menu_site_id: createdMenuSite.id,
        category_id: drinkCategoryId,
        name: "음료 샘플",
        description: "음료 메뉴 예시입니다.",
        price: 7000,
        recommended: false,
        visible: true,
        sort_order: 2,
      },
    ];
    const { error: fallbackItemsError } = await supabase.from("menu_items").insert(minimalItemInserts as never);

    if (fallbackItemsError) {
      throw new Error(`샘플 메뉴 생성에 실패했습니다: ${fallbackItemsError.message}`);
    }
  }

  return createdMenuSite;
}

async function createOrderRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail: string | null | undefined,
  paymentId: string,
  menuSiteId: string,
  orderPayload: MenuOrderPayload,
  verifiedPayment: VerifiedPayment
): Promise<OrderResult> {
  let { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      menu_site_id: menuSiteId,
      product_key: menuCreationProduct.key,
      template_key: orderPayload.template_key,
      order_name: menuCreationProduct.name,
      payment_id: paymentId,
      customer_name: userEmail ?? null,
      buyer_name: orderPayload.buyerName,
      buyer_phone: orderPayload.buyerPhone,
      buyer_email: orderPayload.buyerEmail,
      business_name: orderPayload.businessName,
      business_number: orderPayload.businessNumber,
      raw_payload: orderPayload as unknown as Json,
      status: "paid",
      total_amount: verifiedPayment.amount,
    })
    .select("id")
    .single();

  if (orderError) {
    const fallbackResult = await supabase
      .from("orders")
      .insert(({
        user_id: userId,
        menu_site_id: menuSiteId,
        payment_id: paymentId,
        amount: verifiedPayment.amount,
        status: "paid",
        template_key: orderPayload.template_key,
      } satisfies LooseInsert) as never)
      .select("id")
      .single();

    order = fallbackResult.data;
    orderError = fallbackResult.error;

    if (orderError) {
      throw new Error(`주문 기록 저장에 실패했습니다: ${orderError.message}`);
    }
  }

  return order as OrderResult;
}

async function createPaymentRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paymentId: string,
  orderId: string,
  orderPayload: MenuOrderPayload,
  verifiedPayment: VerifiedPayment
): Promise<PaymentResult> {
  const rawPayload = JSON.parse(
    JSON.stringify({
      portone_payment: verifiedPayment.raw,
      product_key: menuCreationProduct.key,
      order_payload: orderPayload,
    })
  ) as Json;

  let { data: paymentRecord, error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      order_id: orderId,
      product_key: menuCreationProduct.key,
      template_key: orderPayload.template_key,
      payment_id: paymentId,
      portone_payment_id: paymentId,
      status: "paid",
      amount: verifiedPayment.amount,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (paymentError) {
    const fallbackResult = await supabase
      .from("payments")
      .insert(({
        user_id: userId,
        payment_id: paymentId,
        status: "paid",
        amount: verifiedPayment.amount,
        raw_data: rawPayload,
      } satisfies LooseInsert) as never)
      .select("id")
      .single();

    paymentRecord = fallbackResult.data;
    paymentError = fallbackResult.error;

    if (paymentError) {
      throw new Error(`결제 기록 저장에 실패했습니다: ${paymentError.message}`);
    }
  }

  return paymentRecord as PaymentResult;
}

function createMockPortOnePayment(paymentId: string, orderPayload: MenuOrderPayload): VerifiedPayment {
  // TODO: PortOne 테스트 결제 준비가 끝나면 mock 분기는 제거하거나 별도 테스트 전용 플래그로만 유지하세요.
  // production에서는 절대 mock 결제가 통과하지 않도록 NODE_ENV와 paymentId prefix를 함께 검사합니다.
  if (process.env.NODE_ENV === "production" || !paymentId.startsWith("mock_")) {
    throw new Error("mock 결제 검증은 development 환경에서 mock_ paymentId로만 사용할 수 있습니다.");
  }

  const raw: PortOnePayment = {
    id: paymentId,
    paymentId,
    status: "PAID",
    orderName: menuCreationProduct.name,
    currency: menuCreationProduct.currency,
    amount: menuCreationProduct.amount,
    customData: {
      product_key: menuCreationProduct.key,
      template_key: orderPayload.template_key,
      desired_slug: orderPayload.desiredSlug,
      mock: true,
    },
  };

  return {
    id: paymentId,
    amount: menuCreationProduct.amount,
    status: "PAID",
    raw,
  };
}

async function getPortOnePayment(paymentId: string) {
  const apiSecret = requirePortOneApiSecret();
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `PortOne ${apiSecret}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PortOne 결제 조회 실패: ${response.status} ${body}`);
  }

  return (await response.json()) as PortOnePayment;
}

async function verifyPayment(paymentId: string, orderPayload: MenuOrderPayload): Promise<VerifiedPayment> {
  if (process.env.NODE_ENV !== "production" && paymentId.startsWith("mock_")) {
    return createMockPortOnePayment(paymentId, orderPayload);
  }

  const portOnePayment = await getPortOnePayment(paymentId);
  const verifiedPaymentId = portOnePayment.id ?? portOnePayment.paymentId;
  const verifiedAmount = getPaymentAmount(portOnePayment);
  const customTemplateKey = portOnePayment.customData?.template_key ?? portOnePayment.customData?.templateKey;

  if (verifiedPaymentId && verifiedPaymentId !== paymentId) {
    throw new Error("조회한 결제 ID가 요청한 paymentId와 일치하지 않습니다.");
  }

  if (portOnePayment.status !== "PAID") {
    throw new Error(`결제가 완료 상태가 아닙니다. 현재 상태: ${portOnePayment.status ?? "unknown"}`);
  }

  if (verifiedAmount !== menuCreationProduct.amount) {
    throw new Error(`결제 금액이 일치하지 않습니다. 요청 금액: ${menuCreationProduct.amount}, 결제 금액: ${verifiedAmount ?? "unknown"}`);
  }

  if (customTemplateKey && customTemplateKey !== orderPayload.template_key) {
    throw new Error("결제 요청의 template_key와 완료 요청의 template_key가 일치하지 않습니다.");
  }

  return {
    id: paymentId,
    amount: verifiedAmount,
    status: "PAID",
    raw: portOnePayment,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: CompletePaymentRequest;

  try {
    body = (await request.json()) as CompletePaymentRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.");
  }

  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  const orderPayload = parseOrderPayload(body.orderPayload);
  const templateKey = orderPayload?.template_key ?? (typeof body.template_key === "string" ? body.template_key.trim() : "");

  if (!paymentId) {
    return jsonError("paymentId가 없습니다.");
  }

  if (!isTemplateKey(templateKey)) {
    return jsonError("template_key가 올바르지 않습니다.");
  }

  if (!orderPayload) {
    return jsonError("메뉴판 생성을 위한 주문 payload가 올바르지 않습니다.");
  }

  const existingMenu = await findExistingMenuForPayment(supabase, paymentId);

  if (existingMenu) {
    return NextResponse.json({
      ok: true,
      message: "이미 처리된 결제입니다.",
      paymentId,
      orderId: existingMenu.orderId,
      menuSiteId: existingMenu.menuSiteId,
      slug: existingMenu.slug,
      alreadyProcessed: true,
    });
  }

  const existingPayment = await findExistingPaymentRecord(supabase, paymentId);

  if (existingPayment?.status === "paid") {
    return jsonError("결제 기록은 이미 존재하지만 연결된 메뉴판을 찾지 못했습니다. 관리자 확인이 필요합니다.", 409);
  }

  let verifiedPayment: VerifiedPayment;

  try {
    verifiedPayment = await verifyPayment(paymentId, orderPayload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "결제 검증에 실패했습니다.", 502);
  }

  const { data: existingSlug, error: existingSlugError } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", orderPayload.desiredSlug)
    .maybeSingle();

  if (existingSlugError) {
    return jsonError(`slug 중복 확인에 실패했습니다: ${existingSlugError.message}`, 500);
  }

  if (existingSlug) {
    return jsonError("이미 사용 중인 공개 메뉴판 주소입니다. 다른 주소로 다시 신청해주세요.", 409);
  }

  let menuSite: MenuSiteResult;

  try {
    menuSite = await createMenuSiteWithSamples(supabase, user.id, orderPayload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "메뉴판 생성 중 오류가 발생했습니다.", 500);
  }

  let order: OrderResult;

  try {
    order = await createOrderRecord(supabase, user.id, user.email, paymentId, menuSite.id, orderPayload, verifiedPayment);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "주문 기록 저장 중 오류가 발생했습니다.", 500);
  }

  let paymentRecord: PaymentResult;

  try {
    paymentRecord = await createPaymentRecord(supabase, user.id, paymentId, order.id, orderPayload, verifiedPayment);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "결제 기록 저장 중 오류가 발생했습니다.", 500);
  }

  return NextResponse.json({
    ok: true,
    message: "결제 검증이 완료되어 주문과 결제 기록을 저장했습니다.",
    paymentId,
    orderId: order.id,
    paymentRecordId: paymentRecord.id,
    menuSiteId: menuSite.id,
    slug: menuSite.slug,
  });
}
