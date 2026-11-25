import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { ACCOUNT_AVATAR_COLORS, ACCOUNT_AVATAR_MAX_BYTES, getAccountAvatarColor, getAccountAvatarPath, getAccountAvatarUrl, getAccountInitial } from "./account-profile";
import { prepareAccountAvatarImage, readAccountAvatarFile, saveAccountAvatar } from "./account-avatar-image";

const userId = "d795dd7d-bd99-4e7e-a644-600e08643ddd";
const previousPath = `account-avatars/${userId}/de92d806-4cf3-4acd-b796-dd8f45bc2b43.webp`;

test("프로필은 표시 이름의 첫 글자를 쓰고 이름이 없으면 이메일로 대체한다", () => {
  assert.equal(getAccountInitial(" 디앤디커머스 ", "owner@example.test"), "디");
  assert.equal(getAccountInitial("디앤디커머스".normalize("NFD")), "디");
  assert.equal(getAccountInitial("Alice"), "A");
  assert.equal(getAccountInitial("王小明"), "王");
  assert.equal(getAccountInitial("👩‍🍳 셰프"), "👩‍🍳");
  assert.equal(getAccountInitial("  ", "staff@example.test"), "s");
  assert.equal(getAccountInitial(null, null), "회");
});

test("기본 프로필 색상은 계정별로 안정적이며 사진은 본인의 전용 경로만 표시한다", () => {
  assert.ok(ACCOUNT_AVATAR_COLORS.includes(getAccountAvatarColor(userId)));
  assert.equal(getAccountAvatarColor(userId), getAccountAvatarColor(userId));
  assert.ok(new Set(Array.from({ length: 30 }, (_, i) => getAccountAvatarColor(`user-${i}`))).size > 1);
  assert.equal(getAccountAvatarPath(userId, { profile_avatar_path: previousPath }), previousPath);
  for (const path of [previousPath.replace(userId, "someone-else"), "https://outside.test/a.png", `account-avatars/${userId}/../../other.webp`, `${previousPath}?q=1`]) assert.equal(getAccountAvatarPath(userId, { profile_avatar_path: path }), null);
  assert.equal(getAccountAvatarUrl(userId, { avatar_url: "https://oauth.test/avatar" }, "https://storage.test"), null);
  assert.equal(getAccountAvatarUrl(userId, { profile_avatar_path: previousPath }, "https://storage.test/"), `https://storage.test/storage/v1/object/public/menu-images/${previousPath}`);
});

test("기본 프로필은 난색 팔레트를 사용하고 흰 이니셜과 AA 대비를 유지한다", () => {
  assert.deepEqual(ACCOUNT_AVATAR_COLORS, ["orange", "terracotta", "rose", "amber", "coral", "wine"]);
  const css = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");
  for (const color of ACCOUNT_AVATAR_COLORS) {
    const hex = css.match(new RegExp(`--ui-profile-${color}:\\s*#([0-9a-f]{6})`))?.[1];
    assert.ok(hex, color);
    const rgb = hex.match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
    assert.ok(1.05 / (luminance + .05) >= 4.5, color);
  }
});

test("사진은 중앙 정사각형 WebP로 최적화하고 EXIF를 제거한다", async () => {
  const input = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "#b98591" } }).jpeg().withExif({ IFD0: { Copyright: "private" } }).toBuffer();
  const image = await prepareAccountAvatarImage(input, "image/jpeg");
  const meta = await sharp(image).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 512);
  assert.equal(meta.height, 512);
  assert.equal(meta.exif, undefined);
});

test("손상·위장 MIME·SVG·빈 파일·초과 파일은 저장 전에 거부한다", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
  for (const [bytes, mime] of [[png, "image/jpeg"], [Buffer.from("invalid"), "image/png"], [Buffer.from("<svg/>"), "image/svg+xml"], [Buffer.alloc(0), "image/png"], [Buffer.alloc(ACCOUNT_AVATAR_MAX_BYTES + 1), "image/png"]] as const) await assert.rejects(prepareAccountAvatarImage(bytes, mime));
});

test("요청은 파일 한 장만 받고 길이 헤더가 없어도 실제 스트림 크기를 제한한다", async () => {
  const form = new FormData();
  form.append("file", new File(["one"], "one.png", { type: "image/png" }));
  assert.equal((await readAccountAvatarFile(new Request("https://site.test", { method: "POST", body: form }))).name, "one.png");
  form.append("file", new File(["two"], "two.png", { type: "image/png" }));
  await assert.rejects(readAccountAvatarFile(new Request("https://site.test", { method: "POST", body: form })));
  const oversized = new Uint8Array(ACCOUNT_AVATAR_MAX_BYTES + 65537);
  await assert.rejects(readAccountAvatarFile(new Request("https://site.test", { method: "POST", body: oversized })));
});

test("저장 실패는 새 파일만 정리하고 이전 사진을 보존한다", async () => {
  const calls: string[] = [];
  await assert.rejects(saveAccountAvatar(userId, previousPath, new Uint8Array([1]), {
    async upload(path) { calls.push(`upload:${path}`); },
    async update() { calls.push("update"); throw new Error("auth unavailable"); },
    async remove(path) { calls.push(`remove:${path}`); },
  }));
  assert.equal(calls.length, 3);
  assert.equal(calls[1], "update");
  assert.equal(calls[2], calls[0].replace("upload:", "remove:"));
  assert.ok(!calls.includes(`remove:${previousPath}`));
});

test("교체는 업로드와 계정 저장 후 이전 파일을 정리하고 타인 경로는 삭제하지 않는다", async () => {
  const calls: string[] = [];
  const storage = { async upload() { calls.push("upload"); }, async update() { calls.push("update"); }, async remove(path: string) { calls.push(`remove:${path}`); } };
  const next = await saveAccountAvatar(userId, previousPath, new Uint8Array([1]), storage);
  assert.equal(getAccountAvatarPath(userId, { profile_avatar_path: next }), next);
  assert.deepEqual(calls, ["upload", "update", `remove:${previousPath}`]);
  calls.length = 0;
  await saveAccountAvatar(userId, previousPath.replace(userId, "other-user"), null, storage);
  assert.deepEqual(calls, ["update"]);
});

test("기본 이미지로 되돌리기는 계정의 사진 참조 해제 후 자기 파일만 정리한다", async () => {
  const calls: unknown[] = [];
  const next = await saveAccountAvatar(userId, previousPath, null, {
    async upload() { throw new Error("must not upload"); },
    async update(path) { calls.push(path); },
    async remove(path) { calls.push(path); },
  });
  assert.equal(next, null);
  assert.deepEqual(calls, [null, previousPath]);
});
