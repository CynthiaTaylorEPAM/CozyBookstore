INSERT INTO patrons (name, race, tier, home, notes, joined_at) VALUES
('Thrain Emberforge', 'dwarf', 'fellow', 'The Deep Halls', 'Buys his own poetry collection to give as gifts. Do not mention this.', now() - interval '420 days'),
('Ilyana Moonwhisper', 'elf', 'fellow', 'Silverbough', 'Has been "nearly finished" browsing since last spring.', now() - interval '390 days'),
('Pim Butterburr', 'halfling', 'regular', 'Greenhollow', 'Reads cookery books in the shop and leaves crumbs. Forgiven; brings scones.', now() - interval '300 days'),
('Grusha Ironjaw', 'orc', 'regular', 'Redcliff Hold', 'Runs the warband book club. Strong opinions on romance novels.', now() - interval '250 days'),
('Fizzwick Sprocket', 'gnome', 'regular', 'Tinker''s Row', 'Returns books with helpful corrections pencilled in the margins.', now() - interval '210 days'),
('Inspector Gribble', 'goblin', 'regular', 'Lantern Street', 'Always asks whether we have seen anything suspicious. We have not.', now() - interval '180 days'),
('Seraphine Vale', 'fae', 'wanderer', 'The Willow Court', 'Pays in exact change that was not in her hand a moment ago.', now() - interval '120 days'),
('Sir Aldric Fenn', 'human', 'wanderer', 'Emberhollow Keep', 'Looking for a book on dragon slaying. Has been gently redirected to A Field Guide to Polite Dragons.', now() - interval '90 days'),
('Orsolya Brightscale', 'dragonborn', 'fellow', 'Cinder Peak', 'Local author. Signs copies whether asked or not.', now() - interval '365 days'),
('Old Bracken', 'human', 'regular', 'The Mossy Cottage', 'Trades mushrooms for store credit. We do not offer store credit.', now() - interval '60 days'),
('Tilly Cogsworth', 'gnome', 'wanderer', 'Tinker''s Row', 'Her clockwork cat is welcome. Her clockwork goose is not.', now() - interval '30 days'),
('Kessandra Dune', 'human', 'wanderer', 'The Salt Road', 'Passing through with the autumn caravan.', now() - interval '12 days');

-- Tome ids match the catalog service's demo data (002_seed_demo_tomes.sql).
INSERT INTO sales (patron_id, tome_id, tome_title, quantity, unit_price_cp, total_cp, sold_by, sold_at) VALUES
(1, 3, 'Stonesong: Ballads of the Deep Halls', 3, 800, 2400, 'mirabel', now() - interval '23 days'),
(3, 2, 'The Halfling''s Second Breakfast', 1, 650, 650, 'pip', now() - interval '16 days'),
(4, 5, 'Whispers Beneath the Willow', 2, 525, 1050, 'pip', now() - interval '11 days'),
(8, 1, 'A Field Guide to Polite Dragons', 1, 1450, 1450, 'mirabel', now() - interval '3 days'),
(2, 4, 'The Lantern at World''s Edge', 1, 950, 950, 'pip', now() - interval '2 days'),
(6, 6, 'The Case of the Vanishing Familiar', 1, 700, 700, 'pip', now() - interval '1 day'),
(5, 11, 'The Gnome''s Guide to Clockwork Pets', 1, 1675, 1675, 'mirabel', now() - interval '5 hours');
