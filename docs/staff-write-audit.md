# 직원 write audit

최종 검토: 2026-08-06

## 목적

직원 역할로 실행하는 모든 메뉴판 mutation 진입점에서 actor·role·membership·permission·surface를 민감한 payload 없이 기록한다.

## 공통 경계

모든 직원 write 경로는 `requireMenuSiteWriteAccess`를 통과한다. 이 helper는 다음 순서로 실행한다.

1. 현재 Auth 사용자와 active membership을 확인한다.
2. 정확한 role permission을 확인한다.
3. 메뉴판 lifecycle이 해당 write를 허용하는지 확인한다.
4. Owner가 아닌 경우 `staff.write_authorized` audit를 기록한다.
5. audit 기록이 성공한 뒤에만 service-role client를 mutation 호출자에게 반환한다.

Audit 생성 실패는 `MENU_SITE_ACCESS_CHECK_FAILED`로 fail closed되므로 직원 mutation은 시작되지 않는다. Owner 작업은 기존 소유자 경계를 사용하며 staff audit row를 추가하지 않는다.

## 기록 surface

| Surface | 범위 |
| --- | --- |
| `menu_editor_action` | 메뉴 편집, 디자인, 공개·비공개, 번역, AI Server Action |
| `menu_image_upload` | 메뉴 이미지 upload·replace·delete |
| `menu_video_upload` | Display 동영상 upload·replace |
| `menu_widget_image_upload` | 위젯 이미지 upload |
| `menu_widget_mutation` | 위젯 단건 mutation |
| `menu_widget_final_save` | 위젯 최종 저장·정리 |

Metadata에는 `permission`, `surface`, `membership_id`만 저장한다. 메뉴 내용, 번역 본문, 파일 경로, invitation token/hash, AI prompt, provider 응답은 기록하지 않는다.

`staff.write_authorized`는 mutation 성공 기록이 아니라 권한·lifecycle 검사를 통과해 작업을 시작한 감사 이벤트다. 이후 validation 실패나 저장 실패가 가능하므로 이름도 성공을 의미하지 않게 유지한다. 초대·수락·역할 변경·접근 회수는 각각의 구체적인 성공/실패 audit action을 별도로 사용한다.

Production SQL·RLS·데이터를 직접 변경하지 않았다.
