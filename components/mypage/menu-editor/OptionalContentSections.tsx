"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import {
  createChefAction,
  createEventAction,
  createSocialLinkAction,
  deleteChefAction,
  deleteEventAction,
  deleteSocialLinkAction,
  updateChefAction,
  updateEventAction,
  updateSocialLinkAction,
} from "@/app/mypage/menus/actions";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import { getSocialLinkLabel, SOCIAL_LINK_TYPES } from "@/lib/social-links";
import type { Database } from "@/lib/supabase/types";

type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
type MenuSocialLink = Database["public"]["Tables"]["menu_social_links"]["Row"];

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">{children}</p>;
}

function TextInput({ helperText, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <input
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function TextArea({ helperText, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <textarea
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
        className={`mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function Select({ helperText, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { helperText?: ReactNode }) {
  return (
    <>
      <select
        {...props}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
    </>
  );
}

function Checkbox({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return (
    <label className="inline-flex items-start gap-2 text-sm font-bold leading-relaxed text-zinc-600">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-zinc-950" />
      <span>{label}</span>
    </label>
  );
}

function SubmitButton({
  children,
  tone = "dark",
  type = "submit",
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  tone?: "dark" | "light" | "danger";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
  }[tone];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${className}`}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({
  message,
  buttonLabel,
  onCreate,
  disabled = false,
  disabledMessage,
}: {
  message: string;
  buttonLabel: string;
  onCreate: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center">
      <p className="text-sm font-bold text-zinc-400">{message}</p>
      {disabledMessage && <p className="mt-3 text-sm font-bold text-zinc-400">{disabledMessage}</p>}
      <button
        type="button"
        onClick={onCreate}
        disabled={disabled}
        className="mt-5 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <div className="mt-1 break-keep text-sm font-semibold leading-relaxed text-zinc-800">{value || "-"}</div>
    </div>
  );
}

export function ChefsSection({ menuId, chefs }: { menuId: string; chefs: MenuChef[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingChefId, setEditingChefId] = useState<string | null>(null);
  const reachedChefLimit = chefs.length >= MENU_LIMITS.maxChefsPerSite;
  const chefLimitMessage = `셰프/인물 정보는 최대 ${MENU_LIMITS.maxChefsPerSite}명까지 등록할 수 있습니다.`;

  return (
    <SectionCard title="셰프 / 인물" eyebrow="People">
      {chefs.length === 0 && !isCreating ? (
        <EmptyState message="등록된 셰프/인물 정보가 없습니다" buttonLabel="+ 셰프/인물 추가" onCreate={() => setIsCreating(true)} disabled={reachedChefLimit} disabledMessage={reachedChefLimit ? chefLimitMessage : undefined} />
      ) : (
        <div className="space-y-4">
          {chefs.map((chef) => (
            <article key={chef.id} className="rounded-lg border border-zinc-100 p-5">
              {editingChefId === chef.id ? (
                <>
                  <form action={updateChefAction} className="grid gap-4 md:grid-cols-2">
                    <HiddenMenuId menuId={menuId} />
                    <input type="hidden" name="chefId" value={chef.id} />
                    <ChefFields chef={chef} />
                    <div className="flex gap-2 md:col-span-2">
                      <SubmitButton tone="light">저장</SubmitButton>
                      <SubmitButton type="button" tone="light" onClick={() => setEditingChefId(null)}>
                        취소
                      </SubmitButton>
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Detail label="이름" value={chef.chef_name} />
                    <Detail label="역할" value={chef.chef_role} />
                    <div className="md:col-span-2">
                      <Detail label="소개" value={chef.chef_description} />
                    </div>
                    <Detail label="이미지" value={chef.chef_image_url ? "등록됨" : "없음"} />
                    <Detail label="정렬 순서" value={chef.sort_order} />
                    <Detail label="메뉴판 표시" value={chef.visible ? "표시" : "숨김"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton type="button" tone="light" onClick={() => setEditingChefId(chef.id)}>
                      수정
                    </SubmitButton>
                    <form action={deleteChefAction}>
                      <HiddenMenuId menuId={menuId} />
                      <input type="hidden" name="chefId" value={chef.id} />
                      <SubmitButton tone="danger">삭제</SubmitButton>
                    </form>
                  </div>
                </div>
              )}
            </article>
          ))}
          {isCreating ? (
            <ChefForm menuId={menuId} count={chefs.length} onCancel={() => setIsCreating(false)} />
          ) : (
            <>
              {reachedChefLimit && <p className="text-sm font-bold text-zinc-400">{chefLimitMessage}</p>}
              <SubmitButton type="button" tone="light" onClick={() => setIsCreating(true)} disabled={reachedChefLimit}>
                + 셰프/인물 추가
              </SubmitButton>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function ChefForm({ menuId, count, onCancel }: { menuId: string; count: number; onCancel: () => void }) {
  return (
    <form action={createChefAction} className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
      <HiddenMenuId menuId={menuId} />
      <ChefFields count={count} />
      <div className="flex gap-2 md:col-span-2">
        <SubmitButton>셰프/인물 추가</SubmitButton>
        <SubmitButton type="button" tone="light" onClick={onCancel}>
          취소
        </SubmitButton>
      </div>
    </form>
  );
}

function ChefFields({ chef, count }: { chef?: MenuChef; count?: number }) {
  return (
    <>
      <div>
        <FieldLabel required>이름</FieldLabel>
        <TextInput name="chef_name" defaultValue={chef?.chef_name ?? ""} required maxLength={MENU_FIELD_LIMITS.menuChefs.chefName} placeholder="이름을 입력하세요" helperText="셰프/인물 카드에 표시될 이름입니다." />
      </div>
      <div>
        <FieldLabel required>역할</FieldLabel>
        <TextInput name="chef_role" defaultValue={chef?.chef_role ?? ""} required maxLength={MENU_FIELD_LIMITS.menuChefs.chefRole} placeholder="역할을 입력하세요" helperText="예: Head Barista, Executive Chef" />
      </div>
      <div className="md:col-span-2">
        <FieldLabel required>소개</FieldLabel>
        <TextArea name="chef_description" defaultValue={chef?.chef_description ?? ""} required maxLength={MENU_FIELD_LIMITS.menuChefs.chefDescription} placeholder="소개를 입력하세요" helperText={`최대 ${MENU_FIELD_LIMITS.menuChefs.chefDescription}자까지 입력할 수 있습니다.`} />
      </div>
      <div>
        {chef ? (
          <ImageUploadField label="셰프/인물 이미지" menuId={chef.menu_site_id} target="menu-chef" recordId={chef.id} currentUrl={chef.chef_image_url} />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm font-bold leading-relaxed text-zinc-400">
            셰프/인물 정보를 먼저 추가한 뒤 이미지를 등록할 수 있습니다.
          </div>
        )}
      </div>
      <div>
        <FieldLabel>정렬 순서</FieldLabel>
        <TextInput name="chef_sort_order" type="number" min={0} step={1} defaultValue={chef?.sort_order ?? (count ?? 0) + 1} helperText="숫자가 낮을수록 먼저 표시됩니다." />
      </div>
      <div className="md:col-span-2">
        <Checkbox name="chef_visible" label="메뉴판에 표시" defaultChecked={chef?.visible ?? true} />
      </div>
    </>
  );
}

export function EventsSection({ menuId, events }: { menuId: string; events: MenuEvent[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const reachedEventLimit = events.length >= MENU_LIMITS.maxEventsPerSite;
  const eventLimitMessage = `이벤트는 최대 ${MENU_LIMITS.maxEventsPerSite}개까지 등록할 수 있습니다.`;

  return (
    <SectionCard title="이벤트" eyebrow="Events">
      {events.length === 0 && !isCreating ? (
        <EmptyState message="등록된 이벤트가 없습니다" buttonLabel="+ 이벤트 추가" onCreate={() => setIsCreating(true)} disabled={reachedEventLimit} disabledMessage={reachedEventLimit ? eventLimitMessage : undefined} />
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-zinc-100 p-5">
              {editingEventId === event.id ? (
                <form action={updateEventAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenMenuId menuId={menuId} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <EventFields event={event} />
                  <div className="flex gap-2 md:col-span-2">
                    <SubmitButton tone="light">이벤트 저장</SubmitButton>
                    <SubmitButton type="button" tone="light" onClick={() => setEditingEventId(null)}>
                      취소
                    </SubmitButton>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Detail label="이벤트 제목" value={event.event_title} />
                    <Detail label="부제목" value={event.event_subtitle} />
                    <div className="md:col-span-2">
                      <Detail label="설명" value={event.event_description} />
                    </div>
                    <Detail label="기간 문구" value={event.event_period} />
                    <Detail label="이미지" value={event.event_image_url ? "등록됨" : "없음"} />
                    <Detail label="혜택" value={event.event_benefit} />
                    <Detail label="상세" value={event.event_detail} />
                    <Detail label="이벤트가" value={event.event_sale_price_label} />
                    <Detail label="메뉴판 표시" value={event.visible ? "표시" : "숨김"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton type="button" tone="light" onClick={() => setEditingEventId(event.id)}>
                      수정
                    </SubmitButton>
                    <form action={deleteEventAction}>
                      <HiddenMenuId menuId={menuId} />
                      <input type="hidden" name="eventId" value={event.id} />
                      <SubmitButton tone="danger">이벤트 삭제</SubmitButton>
                    </form>
                  </div>
                </div>
              )}
            </article>
          ))}
          {isCreating ? (
            <EventForm menuId={menuId} count={events.length} onCancel={() => setIsCreating(false)} />
          ) : (
            <>
              {reachedEventLimit && <p className="text-sm font-bold text-zinc-400">{eventLimitMessage}</p>}
              <SubmitButton type="button" tone="light" onClick={() => setIsCreating(true)} disabled={reachedEventLimit}>
                + 이벤트 추가
              </SubmitButton>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function EventForm({ menuId, count, onCancel }: { menuId: string; count: number; onCancel: () => void }) {
  return (
    <form action={createEventAction} className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
      <HiddenMenuId menuId={menuId} />
      <EventFields count={count} />
      <div className="flex gap-2 md:col-span-2">
        <SubmitButton>이벤트 추가</SubmitButton>
        <SubmitButton type="button" tone="light" onClick={onCancel}>
          취소
        </SubmitButton>
      </div>
    </form>
  );
}

function EventFields({ event, count }: { event?: MenuEvent; count?: number }) {
  return (
    <>
      <div>
        <FieldLabel required>이벤트 제목</FieldLabel>
        <TextInput name="event_title" defaultValue={event?.event_title ?? ""} required maxLength={MENU_FIELD_LIMITS.menuEvents.eventTitle} placeholder="이벤트 제목을 입력하세요" helperText="이벤트 카드의 제목입니다." />
      </div>
      <div>
        <FieldLabel>부제목</FieldLabel>
        <TextInput name="event_subtitle" defaultValue={event?.event_subtitle ?? ""} maxLength={MENU_FIELD_LIMITS.menuEvents.eventSubtitle} helperText="짧은 보조 문구를 입력할 수 있습니다." />
      </div>
      <div className="md:col-span-2">
        <FieldLabel required>설명</FieldLabel>
        <TextArea name="event_description" defaultValue={event?.event_description ?? ""} required maxLength={MENU_FIELD_LIMITS.menuEvents.eventDescription} placeholder="이벤트 설명을 입력하세요" helperText={`최대 ${MENU_FIELD_LIMITS.menuEvents.eventDescription}자까지 입력할 수 있습니다.`} />
      </div>
      <div>
        <FieldLabel>기간 문구</FieldLabel>
        <TextInput name="event_period" defaultValue={event?.event_period ?? ""} maxLength={MENU_FIELD_LIMITS.menuEvents.eventPeriod} helperText="예: 상시 진행, 시즌 한정, 평일 점심" />
      </div>
      <div>
        {event ? (
          <ImageUploadField label="이벤트 이미지" menuId={event.menu_site_id} target="menu-event" recordId={event.id} currentUrl={event.event_image_url} />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm font-bold leading-relaxed text-zinc-400">
            이벤트를 먼저 추가한 뒤 이미지를 등록할 수 있습니다.
          </div>
        )}
      </div>
      <div>
        <FieldLabel>혜택</FieldLabel>
        <TextInput name="event_benefit" defaultValue={event?.event_benefit ?? ""} maxLength={MENU_FIELD_LIMITS.menuEvents.eventBenefit} helperText="고객이 받을 수 있는 혜택을 짧게 적어주세요." />
      </div>
      <div>
        <FieldLabel>상세</FieldLabel>
        <TextInput name="event_detail" defaultValue={event?.event_detail ?? ""} maxLength={MENU_FIELD_LIMITS.menuEvents.eventDetail} helperText="제외 조건이나 안내가 있으면 입력해주세요." />
      </div>
      <div>
        <FieldLabel>정가 표시 문구</FieldLabel>
        <TextInput name="event_regular_price_label" defaultValue={event?.event_regular_price_label ?? ""} placeholder="29,000원" maxLength={MENU_FIELD_LIMITS.menuEvents.eventRegularPriceLabel} helperText="가격 문구 그대로 표시됩니다." />
      </div>
      <div>
        <FieldLabel>할인가/이벤트가 표시 문구</FieldLabel>
        <TextInput name="event_sale_price_label" defaultValue={event?.event_sale_price_label ?? ""} placeholder="19,000원, 무료" maxLength={MENU_FIELD_LIMITS.menuEvents.eventSalePriceLabel} helperText="할인가 또는 이벤트가 문구를 입력해주세요." />
      </div>
      <div>
        <FieldLabel>시작일</FieldLabel>
        <TextInput name="event_start_date" type="date" defaultValue={dateValue(event?.start_date ?? null)} helperText="기간 노출이 필요할 때만 입력하세요." />
      </div>
      <div>
        <FieldLabel>종료일</FieldLabel>
        <TextInput name="event_end_date" type="date" defaultValue={dateValue(event?.end_date ?? null)} helperText="시작일 이후 날짜를 권장합니다." />
      </div>
      <div>
        <FieldLabel>링크 URL</FieldLabel>
        <TextInput name="event_link_url" type="url" defaultValue={event?.link_url ?? ""} placeholder="https://..." maxLength={MENU_FIELD_LIMITS.menuEvents.linkUrl} helperText="이벤트 상세 페이지가 있을 때 입력하세요." />
      </div>
      <div>
        <FieldLabel>정렬 순서</FieldLabel>
        <TextInput name="event_sort_order" type="number" min={0} step={1} defaultValue={event?.sort_order ?? (count ?? 0) + 1} helperText="숫자가 낮을수록 먼저 표시됩니다." />
      </div>
      <div className="flex flex-col gap-3 md:col-span-2">
        <Checkbox name="event_price_visible" label="이벤트 가격 영역 표시" defaultChecked={event?.event_price_visible ?? true} />
        <Checkbox name="event_visible" label="메뉴판에 표시" defaultChecked={event?.visible ?? true} />
      </div>
    </>
  );
}

export function SocialLinksSection({ menuId, socialLinks }: { menuId: string; socialLinks: MenuSocialLink[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingSocialLinkId, setEditingSocialLinkId] = useState<string | null>(null);
  const reachedSocialLinkLimit = socialLinks.length >= MENU_LIMITS.maxSocialLinksPerSite;
  const socialLinkLimitMessage = `SNS 링크는 최대 ${MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.`;

  return (
    <SectionCard title="SNS" eyebrow="Social">
      <p className="mb-5 break-keep text-sm font-semibold text-zinc-500">공개 메뉴판에서는 display_name을 클릭하면 URL로 이동합니다. SNS 링크는 최대 {MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.</p>
      {socialLinks.length === 0 && !isCreating ? (
        <EmptyState message="등록된 SNS 링크가 없습니다" buttonLabel="+ SNS 추가" onCreate={() => setIsCreating(true)} disabled={reachedSocialLinkLimit} disabledMessage={reachedSocialLinkLimit ? socialLinkLimitMessage : undefined} />
      ) : (
        <div className="space-y-4">
          {socialLinks.map((link) => (
            <article key={link.id} className="rounded-lg border border-zinc-100 p-5">
              {editingSocialLinkId === link.id ? (
                <form action={updateSocialLinkAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenMenuId menuId={menuId} />
                  <input type="hidden" name="socialLinkId" value={link.id} />
                  <SocialLinkFields socialLink={link} />
                  <div className="flex gap-2 md:col-span-2">
                    <SubmitButton tone="light">SNS 저장</SubmitButton>
                    <SubmitButton type="button" tone="light" onClick={() => setEditingSocialLinkId(null)}>
                      취소
                    </SubmitButton>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Detail label="SNS 종류" value={getSocialLinkLabel(link.type)} />
                    <Detail label="화면 표시 라벨" value={link.label} />
                    <Detail label="아이디/표시명" value={link.display_name} />
                    <Detail label="URL" value={link.url} />
                    <Detail label="정렬 순서" value={link.sort_order} />
                    <Detail label="메뉴판 표시" value={link.visible ? "표시" : "숨김"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton type="button" tone="light" onClick={() => setEditingSocialLinkId(link.id)}>
                      수정
                    </SubmitButton>
                    <form action={deleteSocialLinkAction}>
                      <HiddenMenuId menuId={menuId} />
                      <input type="hidden" name="socialLinkId" value={link.id} />
                      <SubmitButton tone="danger">SNS 삭제</SubmitButton>
                    </form>
                  </div>
                </div>
              )}
            </article>
          ))}
          {isCreating ? (
            <SocialLinkForm menuId={menuId} count={socialLinks.length} onCancel={() => setIsCreating(false)} />
          ) : (
            <>
              {reachedSocialLinkLimit && <p className="text-sm font-bold text-zinc-400">{socialLinkLimitMessage}</p>}
              <SubmitButton type="button" tone="light" onClick={() => setIsCreating(true)} disabled={reachedSocialLinkLimit}>
                + SNS 추가
              </SubmitButton>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function SocialLinkForm({ menuId, count, onCancel }: { menuId: string; count: number; onCancel: () => void }) {
  return (
    <form action={createSocialLinkAction} className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
      <HiddenMenuId menuId={menuId} />
      <SocialLinkFields count={count} />
      <div className="flex gap-2 md:col-span-2">
        <SubmitButton>SNS 추가</SubmitButton>
        <SubmitButton type="button" tone="light" onClick={onCancel}>
          취소
        </SubmitButton>
      </div>
    </form>
  );
}

function SocialLinkFields({ socialLink, count }: { socialLink?: MenuSocialLink; count?: number }) {
  return (
    <>
      <div>
        <FieldLabel required>SNS 종류</FieldLabel>
        <Select name="social_type" defaultValue={socialLink?.type ?? ""} required helperText="동일한 SNS 종류는 중복 등록할 수 없습니다.">
          <option value="">선택</option>
          {SOCIAL_LINK_TYPES.map((type) => (
            <option key={type} value={type}>
              {getSocialLinkLabel(type)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel required>화면 표시 라벨</FieldLabel>
        <TextInput name="social_label" defaultValue={socialLink?.label ?? ""} placeholder="인스타그램" required maxLength={MENU_FIELD_LIMITS.menuSocialLinks.label} helperText="메뉴판에 표시되는 SNS 이름입니다." />
      </div>
      <div>
        <FieldLabel required>아이디/표시명</FieldLabel>
        <TextInput name="social_display_name" defaultValue={socialLink?.display_name ?? ""} placeholder="@tablescene_official" required maxLength={MENU_FIELD_LIMITS.menuSocialLinks.displayName} helperText="고객에게 보이는 계정명 또는 표시명입니다." />
      </div>
      <div>
        <FieldLabel required>URL</FieldLabel>
        <TextInput name="social_url" type="url" defaultValue={socialLink?.url ?? ""} placeholder="https://..." required maxLength={MENU_FIELD_LIMITS.menuSocialLinks.url} helperText="https://로 시작하는 전체 URL을 입력해주세요." />
      </div>
      <div>
        <FieldLabel>정렬 순서</FieldLabel>
        <TextInput name="social_sort_order" type="number" min={0} step={1} defaultValue={socialLink?.sort_order ?? (count ?? 0) + 1} helperText="숫자가 낮을수록 먼저 표시됩니다." />
      </div>
      <div className="flex items-end">
        <Checkbox name="social_visible" label="메뉴판에 표시" defaultChecked={socialLink?.visible ?? true} />
      </div>
    </>
  );
}
