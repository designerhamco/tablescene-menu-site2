"use client";

import { useActionState, useState } from "react";

import { ContentPanel } from "@/app/components/ui/content-panel";
import { CheckboxField, CheckboxFieldGroup } from "@/app/components/ui/checkbox-field";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import {
  createStaffInvitationAction,
  type StaffInvitationActionState,
} from "./actions";
import {
  STAFF_INVITATION_ROLE_DESCRIPTIONS,
  STAFF_INVITATION_ROLE_LABELS,
  STAFF_INVITATION_ROLES,
} from "@/lib/staff-invitations";
import type { MenuSiteMemberRole } from "@/lib/menu-site-permissions";

type OwnedMenuSiteOption = {
  id: string;
  name: string;
  slug: string;
};

const initialStaffInvitationActionState: StaffInvitationActionState = {
  status: "idle",
  message: "",
};

export default function StaffInvitationForm({
  menuSites,
  enabled,
}: {
  menuSites: OwnedMenuSiteOption[];
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createStaffInvitationAction,
    initialStaffInvitationActionState,
  );
  const [selectedRole, setSelectedRole] = useState<MenuSiteMemberRole>("editor");
  const unavailable = !enabled || menuSites.length === 0;

  return (
    <ContentPanel>
      <form action={formAction} className="site-stack-group" aria-busy={pending}>
        <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
        <div className="site-stack-title">
          <h3 className="type-content-title">직원 초대</h3>
          <p className="type-body-sm site-copy-muted">한 번의 이메일로 여러 메뉴판에 같은 역할을 부여할 수 있습니다. 초대는 7일 동안 유효합니다.</p>
        </div>
        {!enabled ? (
          <ContentPanel surface="notice" density="compact">
            <p className="type-body-sm">초대 수락 화면과 이메일 운영 환경을 검증한 뒤 발송 기능이 활성화됩니다. 지금은 실제 이메일을 보내지 않습니다.</p>
          </ContentPanel>
        ) : null}
        <label className="site-field-stack type-label">
          직원 이메일
          <input type="email" name="email" autoComplete="email" required disabled={unavailable || pending} placeholder="staff@example.com" className="site-field w-full" />
        </label>
        <div className="site-field-stack">
          <label className="site-field-stack type-label">
            역할
            <select name="role" value={selectedRole} onChange={event => setSelectedRole(event.target.value as MenuSiteMemberRole)} disabled={unavailable || pending} className="site-field w-full">
              {STAFF_INVITATION_ROLES.map(role => <option key={role} value={role}>{STAFF_INVITATION_ROLE_LABELS[role]}</option>)}
            </select>
          </label>
          <ContentPanel surface="muted" density="compact">
            <p className="type-body-sm site-copy-muted">{STAFF_INVITATION_ROLE_DESCRIPTIONS[selectedRole]}</p>
          </ContentPanel>
        </div>
        <fieldset disabled={unavailable || pending} className="site-field-stack">
          <legend className="type-label">초대할 메뉴판</legend>
          {menuSites.length ? (
            <CheckboxFieldGroup label="초대할 메뉴판">
              {menuSites.map((menuSite, index) => (
                <CheckboxField key={menuSite.id} name="menuSiteIds" value={menuSite.id} defaultChecked={index === 0} label={menuSite.name} description={"/menu/" + menuSite.slug} />
              ))}
            </CheckboxFieldGroup>
          ) : (
            <ContentPanel surface="muted" density="compact"><p className="type-body-sm site-copy-muted">직원을 초대할 활성 메뉴판이 없습니다.</p></ContentPanel>
          )}
        </fieldset>
        {state.message ? (
          <ContentPanel surface={state.status === "success" ? "muted" : "notice"} density="compact">
            <p className="type-body-sm" aria-live="polite">{state.message}</p>
          </ContentPanel>
        ) : null}
        <div className="site-action-row">
          <button type="submit" disabled={unavailable || pending} className="site-button site-button-primary">{pending ? "초대 처리 중..." : "초대 이메일 보내기"}</button>
        </div>
      </form>
    </ContentPanel>
  );
}
