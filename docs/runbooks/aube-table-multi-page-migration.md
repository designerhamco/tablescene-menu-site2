# 오브 테이블 멀티페이지 Production migration runbook

대상 파일: `supabase/migrations/20260830072554_add_aube_table_multi_page_fields.sql`

상태: **Production 미적용 — 사람의 명시적 승인 전 실행 금지**

## 금지 사항

- `supabase db push`를 실행하지 않는다.
- linked Production 대상 `supabase migration up`을 실행하지 않는다.
- 과거 migration을 재실행하지 않는다.
- migration 적용 전 generated types를 수동 수정하거나 생성하지 않는다.
- 대상 프로젝트 ref가 `tablescene-prod` / `kfbekbapwsyeanobyjsv`가 아니면 중단한다.

이 저장소는 과거 SQL 일부가 remote migration history와 일치하지 않는다. 승인 후에도 대상 migration 파일 한 건만 Supabase SQL Editor 또는 승인된 linked query 방식으로 적용한다.

## 1. 읽기 전용 사전 검사

아래 쿼리는 schema와 기존 고객 데이터의 기준값만 읽는다.

```sql
select
  current_database() as database_name,
  current_user as database_user,
  now() as checked_at;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'menu_pages' and column_name in ('layout_columns', 'text_alignment'))
    or (table_name = 'menu_categories' and column_name in (
      'course_price', 'course_price_label', 'course_price_visible',
      'course_price_description', 'course_price_description_visible'
    ))
    or (table_name = 'menu_items' and column_name = 'menu_page_id')
    or (table_name = 'menu_category_translations' and column_name in (
      'course_price_label', 'course_price_description'
    ))
  )
order by table_name, column_name;

select count(*) as menu_site_count from public.menu_sites;
select count(*) as menu_page_count from public.menu_pages;
select count(*) as menu_category_count from public.menu_categories;
select count(*) as menu_item_count from public.menu_items;

select template_key, count(*)
from public.menu_sites
where template_key in ('dining_aube_table_a', 'cafe_brew_chapter_a')
group by template_key
order by template_key;
```

중단 조건:

- 대상 신규 column 일부만 존재해 partial apply가 의심된다.
- `dining_aube_table_a` 고객 row가 이미 존재한다.
- 기준 row count를 기록할 수 없다.
- target project를 확정할 수 없다.

## 2. 승인 후 1회 적용

사람이 `PR #72 오브 테이블 Production migration 적용 승인`이라고 명시한 뒤에만 진행한다.

1. `supabase/migrations/20260830072554_add_aube_table_multi_page_fields.sql` 전체를 다시 읽는다.
2. 다른 migration이나 수동 SQL을 합치지 않는다.
3. 승인된 linked query 또는 Supabase SQL Editor에서 파일 전체를 한 번 실행한다.
4. 오류가 발생하면 같은 SQL을 반복 실행하지 않고 결과를 보존한 채 중단한다.

## 3. 사후 검사

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'menu_pages' and column_name in ('layout_columns', 'text_alignment'))
    or (table_name = 'menu_categories' and column_name in (
      'course_price', 'course_price_label', 'course_price_visible',
      'course_price_description', 'course_price_description_visible'
    ))
    or (table_name = 'menu_items' and column_name = 'menu_page_id')
    or (table_name = 'menu_category_translations' and column_name in (
      'course_price_label', 'course_price_description'
    ))
  )
order by table_name, column_name;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'menu_pages_layout_columns_check',
  'menu_pages_text_alignment_check',
  'menu_categories_course_price_check',
  'menu_categories_course_price_label_length_check',
  'menu_categories_course_price_description_length_check',
  'menu_items_menu_page_id_fkey'
)
order by conname;

select event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name = 'validate_menu_item_multi_page_container';

select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_config,
       has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'validate_menu_item_multi_page_container';

select count(*) as menu_site_count from public.menu_sites;
select count(*) as menu_page_count from public.menu_pages;
select count(*) as menu_category_count from public.menu_categories;
select count(*) as menu_item_count from public.menu_items;
```

성공 기준:

- 신규 column 10개가 정확한 type/default/nullability로 존재한다.
- check 5개와 FK 1개가 존재한다.
- 검증 trigger가 `menu_items`에 존재한다.
- 검증 함수는 security invoker, `search_path`가 빈 값으로 고정되고 public/anon/authenticated execute가 모두 false다.
- 사전·사후 기존 table row count가 동일하다.
- RLS, table grant, Storage policy와 고객 row는 변경되지 않는다.

## 4. generated types와 애플리케이션 검증

사후 검사가 모두 통과한 뒤에만 실행한다.

```text
npm run supabase:types
git diff -- lib/supabase/types.ts
npx tsc --noEmit --pretty false
npm run lint
npm run build
npm test --if-present
```

generated file은 공식 명령 결과만 반영하고 수동 수정하지 않는다. 갱신 결과와 Production 적용 기록은 PR #72에 별도 commit으로 추가한다.

## 5. Rollback 경계

신규 오브 테이블 고객 데이터가 만들어지기 전이라도 schema 제거는 destructive action이므로 자동 실행하지 않는다. 적용 실패 또는 회귀가 발생하면 템플릿을 hidden 상태로 유지하고 애플리케이션 배포를 중단한다. 신규 column·trigger·function 제거가 필요하면 사용 row와 의존성을 읽기 전용으로 감사한 뒤 별도 사람 승인을 받는다.
