-- 특정 메뉴판 slug에 대해서만 legacy 기본 메뉴 페이지를 숨김 처리합니다.
-- 전체 삭제 금지: 먼저 visible=false로 비노출 처리한 뒤 화면에서 확인하세요.
-- 사용 전 :target_slug 값을 실제 slug로 바꿔 실행하세요.

with target_site as (
  select id
  from public.menu_sites
  where slug = :target_slug
  limit 1
)
update public.menu_pages page
set visible = false,
    updated_at = now()
from target_site
where page.menu_site_id = target_site.id
  and page.title in ('세트 메뉴', '메인 메뉴', '디저트/음료')
returning page.id, page.menu_site_id, page.title, page.visible;
