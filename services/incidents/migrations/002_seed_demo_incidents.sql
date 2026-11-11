INSERT INTO wards (name, location, description, status) VALUES
('The Threshold Rune', 'Front door', 'Keeps out anything that will not wipe its feet.', 'holding'),
('Candle of Quiet Pages', 'Reading nook', 'Soothes restless books and restless readers alike.', 'holding'),
('The Cellar Seal', 'Cellar hatch', 'Nobody remembers what is down there. Best it stays that way.', 'flickering'),
('Salt Line of Saint Quillon', 'Locked cabinet', 'Renewed every new moon around the restricted tomes.', 'holding');

-- Tome ids match the catalog service's demo data (002_seed_demo_tomes.sql).
INSERT INTO incidents (monster, severity, description, tome_id, tome_title, copies_damaged, status, reported_by, reported_at, resolved_by, resolved_at, resolution) VALUES
('bookwyrm', 'troublesome', 'Found asleep in the herbalism section, very full and not at all sorry.', 12, 'Mushrooms: Friend, Foe or Furniture', 2, 'resolved', 'pip', now() - interval '9 days', 'mirabel', now() - interval '8 days', 'Lured out with a stale almanac and relocated to the compost heap.'),
('mimic', 'dire', 'The "signed first edition" on the counter bit Sir Aldric. He is fine. He is telling everyone.', NULL, NULL, 0, 'resolved', 'mirabel', now() - interval '6 days', 'mirabel', now() - interval '6 days', 'Adventurers hired for 3 gp. Mimic now works as the shop''s cash box.'),
('poltergeist', 'minor', 'Every book in Poetry has been reshelved by colour. It does look rather nice.', NULL, NULL, 0, 'resolved', 'pip', now() - interval '4 days', 'pip', now() - interval '3 days', 'Asked politely to stop. Left out a saucer of ink as thanks.'),
('ink imp', 'troublesome', 'Something is adding rude footnotes to the history books. The spelling is atrocious.', 9, 'A Brief History of the Seven Wars (Abridged, Volume IX)', 1, 'open', 'pip', now() - interval '26 hours', NULL, NULL, NULL),
('dust wraith', 'minor', 'A grey shape drifts along the top shelves at closing time. Customers keep sneezing.', NULL, NULL, 0, 'open', 'mirabel', now() - interval '3 hours', NULL, NULL, NULL);
