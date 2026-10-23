# 고객센터 공지사항 저장 기능

SQL: `supabase/migrations/20261023062509_support_announcements.sql`

현재 상태: 로컬 구현 및 격리 PostgreSQL 검증. 운영 DB 미적용.

## 적용 범위

- `public.support_announcements` 테이블 1개, 공개 목록용 부분 인덱스 1개, 수정 시각을 기록하는 일반 trigger 함수 1개와 trigger 1개.
- RLS 활성화 및 강제. 일반 방문자/회원은 `published`이면서 게시 시각이 지난 글만 읽는다.
- 기존 `admin_users` 등록 계정만 전체 목록 조회·INSERT·UPDATE 가능. 관리자 서버 액션도 매번 인증/권한을 검증한다.
- DELETE 권한은 부여하지 않는다. 비공개 전환으로 게시를 철회한다.
- 기존 고객/메뉴/결제/인증 설정 변경과 기존 데이터 이관·삭제는 없다. 서비스 역할 키는 기능에 사용하지 않는다.

## 운영 적용 전 확인

프로젝트의 기존 운영 SQL 승인 규칙에 따라 아래 SQL 한 건의 적용 승인을 받은 뒤 수동 적용한다. `supabase db push`로 누적 마이그레이션을 한꺼번에 적용하지 않는다.

```sql
select to_regclass('public.support_announcements') as must_be_null,
       to_regclass('public.admin_users') as must_exist;
select to_regprocedure('public.touch_support_announcement()') as must_be_null;
```

동명 객체가 이미 있으면 중단하고 구조와 적용 이력을 확인한다. 적용 승인 후 위 파일의 트랜잭션 한 건만 실행한다.

## 적용 후 확인

```sql
select relrowsecurity, relforcerowsecurity
from pg_class where oid = 'public.support_announcements'::regclass;
select policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename = 'support_announcements';
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'support_announcements'
order by grantee, privilege_type;
select indexdef from pg_indexes
where schemaname = 'public' and tablename = 'support_announcements';
```

RLS와 FORCE RLS가 모두 true인지, 네 정책과 SELECT/관리자 INSERT·UPDATE 권한이 의도대로 존재하는지 확인한다. anon·authenticated에는 DELETE 권한이 없어야 한다.

승인 이후 운영 타입을 다시 생성해 `lib/server/announcement-service.ts`의 격리된 추가 테이블 타입을 generated types로 대체한다. `/admin/announcements`에서 운영자가 비공개 초안을 작성·수정하고, 명시적으로 게시한 글만 고객센터에 노출되는지 확인한다. 사용자 승인 없이 운영 테스트 공지를 생성하지 않는다.

## 로컬 재검증

```sh
PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/qa-announcements-sql.mjs
node --import tsx --test lib/announcements.test.ts
```

격리 DB에서 관리자 생성·수정·게시·비공개 전환, 비관리자 쓰기 차단, 초안/미래 글의 공개 읽기 차단, 삭제 차단, DB 제약과 오래된 수정 충돌을 검증한다. 외부 DB 연결이나 실제 고객 데이터는 사용하지 않는다.

## 되돌리기

문제가 있으면 앱 배포를 이전 버전으로 되돌린다. 신규 테이블은 보존하고 데이터를 삭제하지 않는다. 테이블/정책 제거는 별도 승인 작업이다.
