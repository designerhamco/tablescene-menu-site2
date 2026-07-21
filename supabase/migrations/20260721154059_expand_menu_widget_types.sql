begin;

do $$
declare
  unexpected_widget_type_count integer;
begin
  select count(*)
    into unexpected_widget_type_count
  from public.menu_widgets
  where widget_type not in (
    'notice_text',
    'image_banner',
    'option_list',
    'store_info',
    'image',
    'text',
    'image_text'
  );

  if unexpected_widget_type_count > 0 then
    raise exception
      'Cannot expand menu_widgets widget_type constraint: % unexpected widget_type rows exist.',
      unexpected_widget_type_count;
  end if;
end
$$;

alter table public.menu_widgets
  drop constraint if exists menu_widgets_widget_type_check;

-- Keep legacy widget types for migration-history compatibility.
-- New CafeA widget MVP runtime should create only image/text/image_text.
alter table public.menu_widgets
  add constraint menu_widgets_widget_type_check
  check (
    widget_type in (
      'notice_text',
      'image_banner',
      'option_list',
      'store_info',
      'image',
      'text',
      'image_text'
    )
  );

commit;
