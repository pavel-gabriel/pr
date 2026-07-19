-- Uneltele noi din Studio: calendar de conținut, adaptor multi-canal,
-- scripturi Reels și campanii sezoniere — toate stocate în promo_texts.
alter table public.promo_texts
  drop constraint promo_texts_kind_check;

alter table public.promo_texts
  add constraint promo_texts_kind_check
  check (
    kind in (
      'postare', 'recenzie', 'descriere', 'anunt',
      'calendar', 'adaptare', 'reels', 'campanie'
    )
  );
