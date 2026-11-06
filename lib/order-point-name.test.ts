import assert from "node:assert/strict";
import test from "node:test";
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {AppRouterContext} from "next/dist/shared/lib/app-router-context.shared-runtime";
import RestoreForm from "../components/mypage/OrderPointRestoreForm";
import {getOrderPointNameError,ORDER_POINT_DUPLICATE_NAME_MESSAGE} from "./order-point-name";
const point={id:"archived",label:"1번 테이블",kind:"table" as const};
const current=[{id:"active",label:"1번 테이블",kind:"table" as const}];
const render=(options:Partial<Parameters<typeof RestoreForm>[0]>={})=>renderToStaticMarkup(h(AppRouterContext.Provider,{value:{push(){}} as never},h(RestoreForm,{point,menuSiteId:"example",operatingPoints:current,action:()=>{},...options})));

test("보관 복원 이름은 공백·대소문자와 같은 종류를 기준으로 운영 이름 중복을 검사한다",()=>{
  assert.equal(getOrderPointNameError(point,current),ORDER_POINT_DUPLICATE_NAME_MESSAGE);
  assert.equal(getOrderPointNameError({...point,label:" Table A "},[{id:"active",label:"table a",kind:"table"}]),ORDER_POINT_DUPLICATE_NAME_MESSAGE);
  assert.equal(getOrderPointNameError(point,[{...current[0],kind:"kiosk"}]),undefined);
  assert.equal(getOrderPointNameError(point,[point]),undefined);
  assert.equal(getOrderPointNameError({...point,label:"새 이름"},current),undefined);
});

test("중복 입력은 공통 오류 상태·설명 연결·지속 메시지와 비활성 복원으로 표시한다",()=>{
  const html=render();
  assert.match(html,/aria-invalid="true"/);
  const described=html.match(/aria-describedby="([^"]+)"/);assert.ok(described);
  assert.ok(html.includes(`id="${described[1]}"`));
  assert.match(html,/data-slot="form-message"[^>]*class="text-destructive type-footnote"[^>]*role="alert"/);
  assert.ok(html.includes(ORDER_POINT_DUPLICATE_NAME_MESSAGE));assert.match(html,/disabled=""/);
  const valid=render({point:{...point,label:"2번 테이블"}});
  assert.match(valid,/aria-invalid="false"/);assert.doesNotMatch(valid,/data-slot="form-message"|disabled=""/);
});

test("서버가 뒤늦게 발견한 중복도 해당 이름을 수정할 때까지 입력 아래에 남는다",()=>{
  const labelError={value:"1번 테이블",message:ORDER_POINT_DUPLICATE_NAME_MESSAGE};
  assert.match(render({operatingPoints:[],serverError:labelError}),/aria-invalid="true"/);
  assert.doesNotMatch(render({point:{...point,label:"수정한 이름"},operatingPoints:[],serverError:labelError}),/data-slot="form-message"/);
  assert.match(render({point:{...point,label:"2번 테이블"},pending:true}),/readOnly=""/i);
});
