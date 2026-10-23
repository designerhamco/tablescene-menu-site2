// Isolated PostgreSQL verification. No remote database connections or customer data.
import assert from "node:assert/strict";
import fs from "node:fs";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const admin = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create table public.admin_users(user_id uuid primary key);
  insert into public.admin_users values ('${admin}');
  alter table public.admin_users enable row level security;
  grant select on public.admin_users to authenticated;
  create policy admin_self_read on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
`);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261023062509_support_announcements.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const as = async (role, user = "") => {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
};
try {
  await as("authenticated", member);
  await assert.rejects(
    db.query(
      "insert into public.support_announcements(title,body) values('침입','허용 안 됨')",
    ),
    /row-level security/,
  );
  await as("authenticated", admin);
  const draft = (
    await db.query(
      "insert into public.support_announcements(title,body) values('초안','비공개 본문') returning *",
    )
  ).rows[0];
  const published = (
    await db.query(
      "insert into public.support_announcements(title,body,status,published_at) values('공개 글','공개 본문','published',now()) returning *",
    )
  ).rows[0];
  await db.query(
    "insert into public.support_announcements(title,body,status,published_at) values('미래 글','예약 본문','published',now()+interval '1 day')",
  );
  await assert.rejects(
    db.query(
      "insert into public.support_announcements(title,body,status) values('날짜 없음','본문','published')",
    ),
    /published_announcements_have_date/,
  );
  await assert.rejects(
    db.query(
      "insert into public.support_announcements(title,body) values('  ','본문')",
    ),
    /check constraint/,
  );
  for (const [role, user] of [
    ["anon", ""],
    ["authenticated", member],
  ]) {
    await as(role, user);
    const visible = (
      await db.query("select title from public.support_announcements")
    ).rows.map((row) => row.title);
    assert.deepEqual(visible, ["공개 글"]);
    const changed = await db
      .query(
        "update public.support_announcements set body='침입' where id=$1 returning id",
        [published.id],
      )
      .catch((error) => ({ error }));
    if (role === "anon") assert.ok(changed.error);
    else assert.equal(changed.rows.length, 0);
    await assert.rejects(
      db.query("delete from public.support_announcements where id=$1", [
        published.id,
      ]),
      /permission denied/,
    );
  }
  await as("authenticated", admin);
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.support_announcements",
      )
    ).rows[0].n,
    3,
  );
  const edited = (
    await db.query(
      "update public.support_announcements set title='수정 글',status='published',published_at=now() where id=$1 and updated_at=$2 returning *",
      [draft.id, draft.updated_at],
    )
  ).rows[0];
  assert.equal(edited.title, "수정 글");
  assert.equal(
    (
      await db.query(
        "update public.support_announcements set title='오래된 변경' where id=$1 and updated_at=$2 returning id",
        [draft.id, draft.updated_at],
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update public.support_announcements set status='draft' where id=$1",
    [published.id],
  );
  await as("anon");
  assert.deepEqual(
    (await db.query("select title from public.support_announcements")).rows.map(
      (row) => row.title,
    ),
    ["수정 글"],
  );
  console.log(
    JSON.stringify({
      passed: true,
      cases: [
        "admin create/edit/publish/unpublish",
        "anonymous and member published-only reads",
        "future/draft invisibility",
        "unauthorized writes denied",
        "delete denied",
        "database constraints",
        "stale-edit conflict",
      ],
    }),
  );
} finally {
  await db.close();
}
