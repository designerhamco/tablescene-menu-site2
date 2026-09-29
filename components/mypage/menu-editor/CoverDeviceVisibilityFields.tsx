"use client";

import { useEffect, useState } from "react";

import { useCafeAStarterResetCoordinator } from "@/components/mypage/menu-editor/CafeAStarterResetCoordinator";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";

type CoverDeviceVisibilityFieldsProps = {
  defaultPcVisible: boolean;
  defaultTabletVisible: boolean;
  defaultMobileVisible: boolean;
};

export default function CoverDeviceVisibilityFields({
  defaultPcVisible,
  defaultTabletVisible,
  defaultMobileVisible,
}: CoverDeviceVisibilityFieldsProps) {
  const coordinator = useCafeAStarterResetCoordinator();
  const [visibility, setVisibility] = useState({
    pc: defaultPcVisible,
    tablet: defaultTabletVisible,
    mobile: defaultMobileVisible,
  });
  const [resetVersion, setResetVersion] = useState(0);

  useEffect(() => {
    if (!coordinator?.snapshot) return;
    const coverSettings = coordinator.snapshot.coverSettings;
    const frameId = window.requestAnimationFrame(() => {
      setVisibility({
        pc: coverSettings.menuCoverVisiblePc ?? true,
        tablet: coverSettings.menuCoverVisibleTablet ?? true,
        mobile: coverSettings.menuCoverVisibleMobile ?? true,
      });
      setResetVersion((version) => version + 1);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [coordinator?.resetKey, coordinator?.snapshot]);

  return (
    <section className="md:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
      <input type="hidden" name="menu_cover_device_visibility_present" value="true" />
      <p className="text-sm font-bold text-zinc-800">기기별 표시</p>
      <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-500">
        대표 영역을 표시할 기기를 선택합니다. 숨겨도 이미지와 대표 상품 설정은 삭제되지 않습니다.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SwitchField
          key={`pc-${resetVersion}`}
          name="menu_cover_visible_pc"
          label="PC"
          defaultChecked={visibility.pc}
          onText="표시"
          offText="숨김"
          onCheckedChange={(checked) => setVisibility((current) => ({ ...current, pc: checked }))}
        />
        <SwitchField
          key={`tablet-${resetVersion}`}
          name="menu_cover_visible_tablet"
          label="태블릿"
          defaultChecked={visibility.tablet}
          onText="표시"
          offText="숨김"
          onCheckedChange={(checked) => setVisibility((current) => ({ ...current, tablet: checked }))}
        />
        <SwitchField
          key={`mobile-${resetVersion}`}
          name="menu_cover_visible_mobile"
          label="모바일"
          defaultChecked={visibility.mobile}
          onText="표시"
          offText="숨김"
          onCheckedChange={(checked) => setVisibility((current) => ({ ...current, mobile: checked }))}
        />
      </div>
    </section>
  );
}
