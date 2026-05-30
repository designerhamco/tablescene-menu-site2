import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_PROFILE_MESSAGES,
  mapContactProfileStorageError,
  normalizeContactProfileInput,
  normalizeKoreanPhoneNumber,
  validateContactProfileInput,
} from "./contact-profile";

test("normalizeContactProfileInput trims and normalizes contact fields", () => {
  assert.deepEqual(
    normalizeContactProfileInput({
      contactName: "  디자이너샵  ",
      contactPhone: " 01012345678 ",
      notificationEmail: " USER+MenuLink@Example.COM ",
    }),
    {
      contactName: "디자이너샵",
      contactPhone: "010-1234-5678",
      notificationEmail: "user+tablescene@example.com",
    }
  );
});

test("validateContactProfileInput accepts realistic contact names", () => {
  for (const contactName of ["나형미", "김민수", "디자이너샵", "MenuLink 담당자", "홍길동 매니저", "DND Commerce"]) {
    assert.equal(
      validateContactProfileInput({
        contactName,
        contactPhone: "",
        notificationEmail: "user@example.com",
      }),
      null
    );
  }
});

test("validateContactProfileInput rejects invalid contact names", () => {
  for (const contactName of ["나", "123456789012345678901", "@@@@", "https://example.com", "   "]) {
    assert.equal(
      validateContactProfileInput({
        contactName: contactName.trim(),
        contactPhone: "",
        notificationEmail: "user@example.com",
      }),
      CONTACT_PROFILE_MESSAGES.invalidName
    );
  }
});

test("normalizeKoreanPhoneNumber formats supported Korean phone numbers", () => {
  assert.equal(normalizeKoreanPhoneNumber(""), "");
  assert.equal(normalizeKoreanPhoneNumber("01012345678"), "010-1234-5678");
  assert.equal(normalizeKoreanPhoneNumber("010-1234-5678"), "010-1234-5678");
  assert.equal(normalizeKoreanPhoneNumber("021234567"), "02-123-4567");
  assert.equal(normalizeKoreanPhoneNumber("0212345678"), "02-1234-5678");
  assert.equal(normalizeKoreanPhoneNumber("0311234567"), "031-123-4567");
  assert.equal(normalizeKoreanPhoneNumber("03112345678"), "031-1234-5678");
  assert.equal(normalizeKoreanPhoneNumber("15881234"), "1588-1234");
  assert.equal(normalizeKoreanPhoneNumber("18001234"), "1800-1234");
  assert.equal(normalizeKoreanPhoneNumber("16611234"), "1661-1234");
  assert.equal(normalizeKoreanPhoneNumber("17001234"), "1700-1234");
});

test("validateContactProfileInput accepts optional and normalized phone numbers", () => {
  for (const contactPhone of ["", "010-1234-5678", "02-123-4567", "02-1234-5678", "031-123-4567", "031-1234-5678", "1588-1234", "1800-1234"]) {
    assert.equal(
      validateContactProfileInput({
        contactName: "디자이너샵",
        contactPhone,
        notificationEmail: "user@example.com",
      }),
      null
    );
  }
});

test("validateContactProfileInput rejects invalid phone numbers", () => {
  for (const contactPhone of ["12412424112441212", "abc01012345678", "010-12345-6789", "00000000000", "1234567"]) {
    assert.equal(
      validateContactProfileInput({
        contactName: "디자이너샵",
        contactPhone,
        notificationEmail: "user@example.com",
      }),
      CONTACT_PROFILE_MESSAGES.invalidPhone
    );
  }
});

test("validateContactProfileInput validates notification email", () => {
  for (const notificationEmail of ["designernami90@gmail.com", "hello+tablescene@gmail.com", "admin@dndcommerce.co.kr", "designernami90@gmail.com"]) {
    assert.equal(
      validateContactProfileInput({
        contactName: "디자이너샵",
        contactPhone: "",
        notificationEmail,
      }),
      null
    );
  }

  assert.equal(
    normalizeContactProfileInput({
      contactName: "디자이너샵",
      contactPhone: "",
      notificationEmail: "DESIGNERNAMI90@GMAIL.COM",
    }).notificationEmail,
    "designernami90@gmail.com"
  );

  for (const notificationEmail of ["abc", "abc@", "abc@com", "hello world@gmail.com", "https://example.com", `${"a".repeat(90)}@example.com`, "designernami90@gmail.comㄴㄴ"]) {
    assert.equal(
      validateContactProfileInput({
        contactName: "디자이너샵",
        contactPhone: "",
        notificationEmail,
      }),
      CONTACT_PROFILE_MESSAGES.invalidEmail
    );
  }
});

test("mapContactProfileStorageError explains common database failures", () => {
  assert.deepEqual(mapContactProfileStorageError({ code: "42501", message: "permission denied" }), {
    debugCode: "CONTACT_PROFILE_PERMISSION_DENIED",
    message: CONTACT_PROFILE_MESSAGES.permissionDenied,
  });

  assert.deepEqual(
    mapContactProfileStorageError({
      code: "23514",
      message: 'new row for relation "user_contact_profiles" violates check constraint "user_contact_profiles_contact_phone_check"',
    }),
    {
      debugCode: "CONTACT_PROFILE_PHONE_CONSTRAINT_FAILED",
      message: CONTACT_PROFILE_MESSAGES.invalidPhone,
    }
  );

  assert.deepEqual(
    mapContactProfileStorageError({
      code: "23514",
      message: 'new row for relation "user_contact_profiles" violates check constraint "user_contact_profiles_notification_email_format_check"',
    }),
    {
      debugCode: "CONTACT_PROFILE_EMAIL_CONSTRAINT_FAILED",
      message: CONTACT_PROFILE_MESSAGES.invalidEmail,
    }
  );
});
