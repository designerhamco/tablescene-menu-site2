import assert from "node:assert/strict";
import test from "node:test";

import { resolvePickupBoardTheme } from "./pickup-board-theme";

test("썸머 블루 대기번호판은 메뉴판의 고유 색상과 기본 글꼴을 이어받는다", () => {
  const theme = resolvePickupBoardTheme({ templateKey: "display_menu_a" });

  assert.equal(theme.key, "summer_blue");
  assert.equal(theme.palette.accent, "#007C89");
  assert.equal(theme.palette.accentSoft, "#D7F4F3");
  assert.match(String(theme.typographyStyle["--menu-font-ko"]), /Pretendard/);
  assert.match(String(theme.typographyStyle["--menu-font-en"]), /Alata/);
  assert.equal(theme.fontAssets.length, 2);
});

test("대기번호판은 저장된 메뉴판 글꼴 설정을 정규화해 연동한다", () => {
  const theme = resolvePickupBoardTheme({
    templateKey: "display_menu_a",
    pageSettings: {
      design: {
        koreanFont: "noto-sans-kr",
        englishFont: "outfit",
      },
    },
  });

  assert.match(String(theme.typographyStyle["--menu-font-ko"]), /Noto Sans KR/);
  assert.match(String(theme.typographyStyle["--menu-font-en"]), /Outfit/);
});

test("아직 전용 대기번호 디자인이 없는 템플릿은 안전한 중립 테마를 사용한다", () => {
  const theme = resolvePickupBoardTheme({ templateKey: "future_display_template" });

  assert.equal(theme.key, "neutral");
  assert.equal(theme.templateKey, "future_display_template");
  assert.equal(theme.palette.surface, "#FFFFFF");
});
