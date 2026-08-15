-- Kitten pricing, mirroring how puppy pricing already works for dogs — a
-- flat rate per service (no weight bands, unlike puppies, since kittens
-- don't vary in size nearly as much as puppy breeds do).
alter table pets add column if not exists is_kitten boolean not null default false;
