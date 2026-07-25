-- Format video (16:9 pentru meniu, 9:16 vertical pentru social media)
alter table public.video_jobs
  add column aspect_ratio text not null default '16:9'
  check (aspect_ratio in ('16:9', '9:16', '1:1'));
