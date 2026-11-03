import assert from "node:assert/strict";
import test from "node:test";
import { detectTerminalDevice, readTerminalDeviceInfo, formatTerminalDevice } from "./terminal-device-info";

test("기기는 OS·모델·브라우저로 표시하고 확인되지 않은 상세 모델은 만들지 않는다", () => {
  const iphone = detectTerminalDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1");
  assert.equal(iphone.kind, "모바일"); assert.equal(iphone.os, "iOS 27.0.1"); assert.equal(iphone.model, "iPhone · 상세 모델 미확인"); assert.equal(iphone.browser, "Safari 27.0");
  const ipad = detectTerminalDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", { maxTouchPoints: 5 });
  assert.equal(ipad.kind, "태블릿"); assert.equal(ipad.os, "iPadOS"); assert.equal(ipad.model, "iPad · 상세 모델 미확인");
  const android = detectTerminalDevice("Mozilla/5.0 (Linux; Android 13; SM-X900 Build/TP1A) Chrome/130.0.0.0 Safari/537.36", { platformVersion: "15.0.0", model: "SM-X900" });
  assert.equal(android.kind, "태블릿"); assert.equal(android.os, "Android 15.0.0"); assert.equal(android.model, "SM-X900");
  const pc = detectTerminalDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", { platformVersion: "13.0.0" });
  assert.equal(pc.os, "Windows 11"); assert.equal(pc.browser, "Edge 130.0.0.0");
  assert.match(formatTerminalDevice(android), /^\[태블릿\] Android 15.0.0 · SM-X900 · Chrome/);
});

test("등록 기기 정보는 표시용 네 필드로 제한하고 제어 문자·과도한 길이를 제거한다", () => {
  assert.equal(readTerminalDeviceInfo(null), null); assert.equal(readTerminalDeviceInfo([]), null); assert.equal(readTerminalDeviceInfo({}), null);
  const result = readTerminalDeviceInfo({ kind: "spoofed", os: " iOS\n27 ", model: "x".repeat(500), browser: "Safari", secret: "must-not-leak" });
  assert.equal(result?.kind, "기기"); assert.equal(result?.os, "iOS27"); assert.equal(result?.model.length, 100); assert.equal("secret" in result!, false);
});
