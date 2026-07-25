-- Specialități de bucătării — pentru căutări gen „restaurant chinezesc”
insert into public.listing_tags (name, slug, kind) values
  ('Bucătărie chinezească', 'chinezeasca', 'mancare'),
  ('Bucătărie italiană', 'italiana', 'mancare'),
  ('Bucătărie asiatică', 'asiatica', 'mancare'),
  ('Bucătărie mexicană', 'mexicana', 'mancare'),
  ('Bucătărie indiană', 'indiana', 'mancare'),
  ('Bucătărie turcească', 'turceasca', 'mancare'),
  ('Bucătărie grecească', 'greceasca', 'mancare')
on conflict (slug) do nothing;
