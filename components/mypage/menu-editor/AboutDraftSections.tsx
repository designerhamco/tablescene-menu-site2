"use client";

import { useMemo, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { toast } from "sonner";

import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import { getSocialLinkLabel, SOCIAL_LINK_TYPES } from "@/lib/social-links";
import type { Database } from "@/lib/supabase/types";

type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
type MenuSocialLink = Database["public"]["Tables"]["menu_social_links"]["Row"];

type DraftMeta = {
  draftId: string;
  id?: string;
  deleted?: boolean;
};

type SocialLinkDraft = DraftMeta & {
  type: string;
  label: string;
  display_name: string;
  url: string;
  visible: boolean;
  sort_order: number;
};

type ChefDraft = DraftMeta & {
  chef_name: string;
  chef_role: string;
  chef_description: string;
  chef_image_url: string | null;
  visible: boolean;
  sort_order: number;
};

type EventDraft = DraftMeta & {
  event_title: string;
  event_subtitle: string;
  event_description: string;
  event_period: string;
  event_benefit: string;
  event_detail: string;
  event_regular_price_label: string;
  event_sale_price_label: string;
  event_price_visible: boolean;
  start_date: string;
  end_date: string;
  link_url: string;
  event_image_url: string | null;
  visible: boolean;
  sort_order: number;
};

type AboutDraftSectionsProps = {
  socialLinks: MenuSocialLink[];
  chefs: MenuChef[];
  showSocialLinks: boolean;
  showChefs: boolean;
};

type EventDraftSectionsProps = {
  events: MenuEvent[];
  showEvents: boolean;
};

function createDraftId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function socialToDraft(link: MenuSocialLink): SocialLinkDraft {
  return {
    draftId: link.id,
    id: link.id,
    type: link.type,
    label: link.label ?? "",
    display_name: link.display_name ?? "",
    url: link.url ?? "",
    visible: link.visible ?? true,
    sort_order: link.sort_order ?? 0,
  };
}

function chefToDraft(chef: MenuChef): ChefDraft {
  return {
    draftId: chef.id,
    id: chef.id,
    chef_name: chef.chef_name ?? "",
    chef_role: chef.chef_role ?? "",
    chef_description: chef.chef_description ?? "",
    chef_image_url: chef.chef_image_url,
    visible: chef.visible ?? true,
    sort_order: chef.sort_order ?? 0,
  };
}

function eventToDraft(event: MenuEvent): EventDraft {
  return {
    draftId: event.id,
    id: event.id,
    event_title: event.event_title ?? "",
    event_subtitle: event.event_subtitle ?? "",
    event_description: event.event_description ?? "",
    event_period: event.event_period ?? "",
    event_benefit: event.event_benefit ?? "",
    event_detail: event.event_detail ?? "",
    event_regular_price_label: event.event_regular_price_label ?? "",
    event_sale_price_label: event.event_sale_price_label ?? "",
    event_price_visible: event.event_price_visible ?? true,
    start_date: dateValue(event.start_date),
    end_date: dateValue(event.end_date),
    link_url: event.link_url ?? "",
    event_image_url: event.event_image_url,
    visible: event.visible ?? true,
    sort_order: event.sort_order ?? 0,
  };
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">{children}</p>;
}

function TextInput({ helperText, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  return (
    <>
      <input
        {...props}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
    </>
  );
}

function TextArea({ helperText, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  return (
    <>
      <textarea
        {...props}
        className={`mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
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

function SectionCard({ title, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
      <h3 className="text-xl font-bold tracking-tight text-zinc-950">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ message, buttonLabel, onClick, disabled }: { message: string; buttonLabel: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-6 text-center">
      <p className="break-keep text-sm font-bold text-zinc-400">{message}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="mt-5 rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function removeOrMarkDeleted<T extends DraftMeta>(rows: T[], draftId: string) {
  return rows.flatMap((row) => {
    if (row.draftId !== draftId) return [row];
    if (row.id) return [{ ...row, deleted: true }];
    return [];
  });
}

function showDraftToast(message: string) {
  toast.success(message);
}

function DraftDeleteConfirmButton({
  title,
  description,
  isConfirming,
  onRequestConfirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  isConfirming: boolean;
  onRequestConfirm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onRequestConfirm}
        className="rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
      >
        삭제
      </button>
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-5">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h4 className="text-lg font-bold tracking-tight text-zinc-950">{title}</h4>
            <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{description}</p>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                삭제 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function AboutDraftSections({
  socialLinks,
  chefs,
  showSocialLinks,
  showChefs,
}: AboutDraftSectionsProps) {
  const [socialDrafts, setSocialDrafts] = useState<SocialLinkDraft[]>(() => socialLinks.map(socialToDraft));
  const [chefDrafts, setChefDrafts] = useState<ChefDraft[]>(() => chefs.map(chefToDraft));
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState("");

  const visibleSocialDrafts = useMemo(() => socialDrafts.filter((link) => !link.deleted), [socialDrafts]);
  const visibleChefDrafts = useMemo(() => chefDrafts.filter((chef) => !chef.deleted), [chefDrafts]);

  function updateSocial(draftId: string, patch: Partial<SocialLinkDraft>) {
    setSocialDrafts((current) => current.map((link) => (link.draftId === draftId ? { ...link, ...patch } : link)));
  }

  function updateChef(draftId: string, patch: Partial<ChefDraft>) {
    setChefDrafts((current) => current.map((chef) => (chef.draftId === draftId ? { ...chef, ...patch } : chef)));
  }

  function addSocial() {
    if (visibleSocialDrafts.length >= MENU_LIMITS.maxSocialLinksPerSite) return;
    setSocialDrafts((current) => [
      ...current,
      {
        draftId: createDraftId("social"),
        type: "",
        label: "",
        display_name: "",
        url: "",
        visible: true,
        sort_order: visibleSocialDrafts.length + 1,
      },
    ]);
    showDraftToast("SNS 링크가 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  function addChef() {
    if (visibleChefDrafts.length >= MENU_LIMITS.maxChefsPerSite) return;
    setChefDrafts((current) => [
      ...current,
      {
        draftId: createDraftId("chef"),
        chef_name: "",
        chef_role: "",
        chef_description: "",
        chef_image_url: null,
        visible: true,
        sort_order: visibleChefDrafts.length + 1,
      },
    ]);
    showDraftToast("셰프/인물 정보가 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  return (
    <div className="space-y-5 md:col-span-2">
      {showSocialLinks && (
        <>
          <input type="hidden" name="include_social_links" value="on" />
          <input type="hidden" name="about_social_links_draft" value={JSON.stringify(socialDrafts)} />
          <SectionCard title="SNS 링크" eyebrow="Social">
            <p className="mb-5 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              SNS 링크는 소개 탭의 저장을 눌렀을 때 반영됩니다. 최대 {MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.
            </p>
            {visibleSocialDrafts.length === 0 ? (
              <EmptyState
                message="등록된 SNS 링크가 없습니다"
                buttonLabel="+ SNS 추가"
                onClick={addSocial}
                disabled={visibleSocialDrafts.length >= MENU_LIMITS.maxSocialLinksPerSite}
              />
            ) : (
              <div className="space-y-4">
                {visibleSocialDrafts.map((link) => (
                  <article key={link.draftId} className="grid gap-4 rounded-lg border border-zinc-100 bg-white p-5 md:grid-cols-2">
                    <div>
                      <FieldLabel required>SNS 종류</FieldLabel>
                      <Select
                        value={link.type}
                        required
                        helperText="동일한 SNS 종류는 중복 등록할 수 없습니다."
                        onChange={(event) => updateSocial(link.draftId, { type: event.target.value })}
                      >
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
                      <TextInput
                        value={link.label}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuSocialLinks.label}
                        placeholder="인스타그램"
                        onChange={(event) => updateSocial(link.draftId, { label: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel required>아이디/표시명</FieldLabel>
                      <TextInput
                        value={link.display_name}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuSocialLinks.displayName}
                        placeholder="@tablescene_official"
                        onChange={(event) => updateSocial(link.draftId, { display_name: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel required>URL</FieldLabel>
                      <TextInput
                        type="url"
                        value={link.url}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuSocialLinks.url}
                        placeholder="https://..."
                        onChange={(event) => updateSocial(link.draftId, { url: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>정렬 순서</FieldLabel>
                      <TextInput
                        type="number"
                        min={0}
                        step={1}
                        value={link.sort_order}
                        onChange={(event) => updateSocial(link.draftId, { sort_order: Number(event.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-end">
                      <SwitchField
                        name={`social_visible_${link.draftId}`}
                        label="메뉴판에 표시"
                        defaultChecked={link.visible}
                        onCheckedChange={(checked) => updateSocial(link.draftId, { visible: checked })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
                      <DraftDeleteConfirmButton
                        title="이 SNS 링크를 삭제할까요?"
                        description="삭제해도 소개 탭의 저장을 누르기 전까지 실제 공개 메뉴판에는 반영되지 않습니다."
                        isConfirming={confirmingDeleteKey === `social:${link.draftId}`}
                        onRequestConfirm={() => setConfirmingDeleteKey(`social:${link.draftId}`)}
                        onConfirm={() => {
                          setSocialDrafts((current) => removeOrMarkDeleted(current, link.draftId));
                          showDraftToast("SNS 링크가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
                        }}
                        onCancel={() => setConfirmingDeleteKey("")}
                      />
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={addSocial}
                  disabled={visibleSocialDrafts.length >= MENU_LIMITS.maxSocialLinksPerSite}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  + SNS 추가
                </button>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {showChefs && (
        <>
          <input type="hidden" name="include_chefs" value="on" />
          <input type="hidden" name="about_chefs_draft" value={JSON.stringify(chefDrafts)} />
          <SectionCard title="셰프 / 인물" eyebrow="People">
            {visibleChefDrafts.length === 0 ? (
              <EmptyState
                message="등록된 셰프/인물 정보가 없습니다"
                buttonLabel="+ 셰프/인물 추가"
                onClick={addChef}
                disabled={visibleChefDrafts.length >= MENU_LIMITS.maxChefsPerSite}
              />
            ) : (
              <div className="space-y-4">
                {visibleChefDrafts.map((chef) => (
                  <article key={chef.draftId} className="grid gap-4 rounded-lg border border-zinc-100 bg-white p-5 md:grid-cols-2">
                    <div>
                      <FieldLabel required>이름</FieldLabel>
                      <TextInput
                        value={chef.chef_name}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuChefs.chefName}
                        placeholder="이름을 입력하세요"
                        onChange={(event) => updateChef(chef.draftId, { chef_name: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel required>역할</FieldLabel>
                      <TextInput
                        value={chef.chef_role}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuChefs.chefRole}
                        placeholder="역할을 입력하세요"
                        onChange={(event) => updateChef(chef.draftId, { chef_role: event.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel required>소개</FieldLabel>
                      <TextArea
                        value={chef.chef_description}
                        required
                        maxLength={MENU_FIELD_LIMITS.menuChefs.chefDescription}
                        placeholder="소개를 입력하세요"
                        onChange={(event) => updateChef(chef.draftId, { chef_description: event.target.value })}
                      />
                    </div>
                    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-400">
                      이미지: {chef.chef_image_url ? "기존 이미지 유지" : "없음"}
                      <br />
                      이미지 업로드 draft화는 후속 작업에서 처리합니다.
                    </div>
                    <div>
                      <FieldLabel>정렬 순서</FieldLabel>
                      <TextInput
                        type="number"
                        min={0}
                        step={1}
                        value={chef.sort_order}
                        onChange={(event) => updateChef(chef.draftId, { sort_order: Number(event.target.value) || 0 })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <SwitchField
                        name={`chef_visible_${chef.draftId}`}
                        label="메뉴판에 표시"
                        defaultChecked={chef.visible}
                        onCheckedChange={(checked) => updateChef(chef.draftId, { visible: checked })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
                      <DraftDeleteConfirmButton
                        title="이 셰프/인물 정보를 삭제할까요?"
                        description="삭제해도 소개 탭의 저장을 누르기 전까지 실제 공개 메뉴판에는 반영되지 않습니다."
                        isConfirming={confirmingDeleteKey === `chef:${chef.draftId}`}
                        onRequestConfirm={() => setConfirmingDeleteKey(`chef:${chef.draftId}`)}
                        onConfirm={() => {
                          setChefDrafts((current) => removeOrMarkDeleted(current, chef.draftId));
                          showDraftToast("셰프/인물 정보가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
                        }}
                        onCancel={() => setConfirmingDeleteKey("")}
                      />
                    </div>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={addChef}
                  disabled={visibleChefDrafts.length >= MENU_LIMITS.maxChefsPerSite}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                >
                  + 셰프/인물 추가
                </button>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}

export function EventDraftSections({ events, showEvents }: EventDraftSectionsProps) {
  const [eventDrafts, setEventDrafts] = useState<EventDraft[]>(() => events.map(eventToDraft));
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState("");
  const visibleEventDrafts = useMemo(() => eventDrafts.filter((event) => !event.deleted), [eventDrafts]);

  function updateEvent(draftId: string, patch: Partial<EventDraft>) {
    setEventDrafts((current) => current.map((event) => (event.draftId === draftId ? { ...event, ...patch } : event)));
  }

  function addEvent() {
    if (visibleEventDrafts.length >= MENU_LIMITS.maxEventsPerSite) return;
    setEventDrafts((current) => [
      ...current,
      {
        draftId: createDraftId("event"),
        event_title: "",
        event_subtitle: "",
        event_description: "",
        event_period: "",
        event_benefit: "",
        event_detail: "",
        event_regular_price_label: "",
        event_sale_price_label: "",
        event_price_visible: true,
        start_date: "",
        end_date: "",
        link_url: "",
        event_image_url: null,
        visible: true,
        sort_order: visibleEventDrafts.length + 1,
      },
    ]);
    showDraftToast("이벤트가 임시 추가되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
  }

  if (!showEvents) {
    return null;
  }

  return (
    <div className="space-y-5 md:col-span-2">
      <input type="hidden" name="include_events" value="on" />
      <input type="hidden" name="events_draft" value={JSON.stringify(eventDrafts)} />
      <SectionCard title="이벤트 목록 관리" eyebrow="Events">
        <p className="mb-5 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
          이벤트 추가, 수정, 삭제는 이벤트 탭의 저장을 눌렀을 때 반영됩니다. 최대 {MENU_LIMITS.maxEventsPerSite}개까지 등록할 수 있습니다.
        </p>
        {visibleEventDrafts.length === 0 ? (
          <EmptyState
            message="등록된 이벤트/공지가 없습니다"
            buttonLabel="+ 이벤트 추가"
            onClick={addEvent}
            disabled={visibleEventDrafts.length >= MENU_LIMITS.maxEventsPerSite}
          />
        ) : (
          <div className="space-y-4">
            {visibleEventDrafts.map((event) => {
              const hasEventPriceData = Boolean(event.event_regular_price_label.trim() || event.event_sale_price_label.trim());

              return (
                <article key={event.draftId} className="grid gap-4 rounded-lg border border-zinc-100 bg-white p-5 md:grid-cols-2">
                  <div>
                    <FieldLabel required>이벤트 제목</FieldLabel>
                    <TextInput
                      value={event.event_title}
                      required
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventTitle}
                      placeholder="이벤트 제목을 입력하세요"
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_title: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>부제목</FieldLabel>
                    <TextInput
                      value={event.event_subtitle}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventSubtitle}
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_subtitle: inputEvent.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>설명</FieldLabel>
                    <TextArea
                      value={event.event_description}
                      required
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventDescription}
                      placeholder="이벤트 설명을 입력하세요"
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_description: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>기간 문구</FieldLabel>
                    <TextInput
                      value={event.event_period}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventPeriod}
                      placeholder="상시 진행"
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_period: inputEvent.target.value })}
                    />
                  </div>
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm font-bold leading-relaxed text-zinc-400">
                    이미지: {event.event_image_url ? "기존 이미지 유지" : "없음"}
                    <br />
                    이미지 업로드 draft화는 후속 작업에서 처리합니다.
                  </div>
                  <div>
                    <FieldLabel>혜택</FieldLabel>
                    <TextInput
                      value={event.event_benefit}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventBenefit}
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_benefit: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>상세</FieldLabel>
                    <TextInput
                      value={event.event_detail}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventDetail}
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_detail: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>정가 표시 문구</FieldLabel>
                    <TextInput
                      value={event.event_regular_price_label}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventRegularPriceLabel}
                      placeholder="29,000원"
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_regular_price_label: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>할인가/이벤트가 표시 문구</FieldLabel>
                    <TextInput
                      value={event.event_sale_price_label}
                      maxLength={MENU_FIELD_LIMITS.menuEvents.eventSalePriceLabel}
                      placeholder="19,000원, 무료"
                      onChange={(inputEvent) => updateEvent(event.draftId, { event_sale_price_label: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>시작일</FieldLabel>
                    <TextInput
                      type="date"
                      value={event.start_date}
                      onChange={(inputEvent) => updateEvent(event.draftId, { start_date: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>종료일</FieldLabel>
                    <TextInput
                      type="date"
                      value={event.end_date}
                      onChange={(inputEvent) => updateEvent(event.draftId, { end_date: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>링크 URL</FieldLabel>
                    <TextInput
                      type="url"
                      value={event.link_url}
                      placeholder="https://..."
                      maxLength={MENU_FIELD_LIMITS.menuEvents.linkUrl}
                      onChange={(inputEvent) => updateEvent(event.draftId, { link_url: inputEvent.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>정렬 순서</FieldLabel>
                    <TextInput
                      type="number"
                      min={0}
                      step={1}
                      value={event.sort_order}
                      onChange={(inputEvent) => updateEvent(event.draftId, { sort_order: Number(inputEvent.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex flex-col gap-3 md:col-span-2">
                    <SwitchField
                      key={`${event.draftId}-price-${hasEventPriceData}`}
                      name={`event_price_visible_${event.draftId}`}
                      label="이벤트 가격 영역 표시"
                      defaultChecked={Boolean(event.event_price_visible && hasEventPriceData)}
                      canTurnOn={hasEventPriceData}
                      blockedMessage="이벤트 가격 정보를 먼저 입력해주세요."
                      onCheckedChange={(checked) => updateEvent(event.draftId, { event_price_visible: checked })}
                    />
                    <SwitchField
                      name={`event_visible_${event.draftId}`}
                      label="메뉴판에 표시"
                      defaultChecked={event.visible}
                      onCheckedChange={(checked) => updateEvent(event.draftId, { visible: checked })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
                    <DraftDeleteConfirmButton
                      title="이 이벤트를 삭제할까요?"
                      description="삭제해도 이벤트 탭의 저장을 누르기 전까지 실제 공개 메뉴판에는 반영되지 않습니다."
                      isConfirming={confirmingDeleteKey === `event:${event.draftId}`}
                      onRequestConfirm={() => setConfirmingDeleteKey(`event:${event.draftId}`)}
                      onConfirm={() => {
                        setEventDrafts((current) => removeOrMarkDeleted(current, event.draftId));
                        showDraftToast("이벤트가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다.");
                      }}
                      onCancel={() => setConfirmingDeleteKey("")}
                    />
                  </div>
                </article>
              );
            })}
            <button
              type="button"
              onClick={addEvent}
              disabled={visibleEventDrafts.length >= MENU_LIMITS.maxEventsPerSite}
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              + 이벤트 추가
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
