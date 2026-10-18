import assert from "node:assert/strict";
import test from "node:test";
import { getTemplatePageWindow } from "./template-pagination";

test("템플릿 페이지 번호는 처음·중간·끝에서 현재 페이지를 포함한 제한된 창을 표시한다", () => {
  assert.deepEqual(getTemplatePageWindow(1, 2, 7), [1, 2]);
  assert.deepEqual(getTemplatePageWindow(1, 20, 7), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(getTemplatePageWindow(10, 20, 7), [7, 8, 9, 10, 11, 12, 13]);
  assert.deepEqual(getTemplatePageWindow(20, 20, 7), [14, 15, 16, 17, 18, 19, 20]);
  assert.deepEqual(getTemplatePageWindow(10, 20, 3), [9, 10, 11]);
  assert.deepEqual(getTemplatePageWindow(20, 20, 3), [18, 19, 20]);
  for (const count of [3, 7]) {
    for (const total of [1, 2, 3, 7, 8, 20, 100]) {
      for (let current = 1; current <= total; current++) {
        const pages = getTemplatePageWindow(current, total, count);
        assert.equal(pages.length, Math.min(count, total));
        assert.ok(pages.includes(current));
        assert.ok(pages[0] >= 1 && pages.at(-1)! <= total);
        assert.ok(pages.every((page, index) => !index || page === pages[index - 1] + 1));
      }
    }
  }
});
