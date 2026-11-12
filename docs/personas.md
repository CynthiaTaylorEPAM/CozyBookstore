# Personas

The people who use The Gilded Griffin's system, or would if it served them. Use these to refine user journeys and to write and test feature requests: every feature should name who it is for and what it changes about their day.

Two of these people can sign in today. One can use the public landing page. The rest have a relationship with the shop that the system does not yet support, which is where much of the [backlog](backlog.md) comes from.

## At a glance

| Persona | Role | In the system today | In a real client system, this is |
|---|---|---|---|
| [Mirabel Thistlewick](#mirabel-thistlewick-owner) | Owner | Signs in as `owner` | Business owner, administrator |
| [Pip Underbough](#pip-underbough-clerk) | Clerk | Signs in as `clerk` | Front-line staff, service agent |
| [Sir Aldric Fenn](#sir-aldric-fenn-first-time-visitor) | First-time visitor | Public landing page only | Anonymous prospect |
| [Grusha Ironjaw](#grusha-ironjaw-regular-patron) | Regular patron | A record staff keep about her | Repeat customer, group buyer |
| [Ilyana Moonwhisper](#ilyana-moonwhisper-fellow-of-the-griffin) | Fellow of the Griffin | A record staff keep about her | Premium or loyalty-tier customer |
| [Kessandra Dune](#kessandra-dune-travelling-patron) | Travelling patron | A record staff keep about her | Remote, mobile-only customer |
| [Orsolya Brightscale](#orsolya-brightscale-local-author) | Local author | A patron record, and an author name on a tome | Content partner, consignment vendor |
| [Quillon Vance](#quillon-vance-scribes-guild-factor) | Supplier | Not represented | Supplier, vendor account manager |
| [Bran Holloway](#bran-holloway-adventurer-for-hire) | Adventurer for hire | Mentioned in incident notes | External contractor, field technician |
| [Hesper Nightingale](#hesper-nightingale-wardwright) | Wardwright | Not represented | Maintenance provider, facilities |
| [Magister Edda Farrow](#magister-edda-farrow-guild-auditor) | Guild auditor | Not represented | Auditor, regulator, compliance |

Mirabel, Pip and the six patrons and authors above already appear in the demo data. Quillon, Bran, Hesper and Edda are new characters.

---

## Staff

### Mirabel Thistlewick, owner

> "I know every book on these shelves. What I do not know is whether we made any money this month."

**Who she is.** A halfling in her fifties who inherited the shop from her aunt and has run it for twenty years. Author of *The Bookwyrm and Other Shelf Pests*, written from bitter experience. Does the books at the kitchen table after closing, with tea.

**Comfort with the system.** Capable but impatient. Uses it on the shop's one good scrying-glass (a desktop) and wants answers in one look, not five clicks.

**What she is trying to do**
- Know how the shop is doing: takings, what sells, what sits.
- Never run out of a favourite, and never over-order a dud.
- Reward loyal patrons without giving the shop away.
- Keep the shop safe, and know the true cost of each monster.
- Be able to take a day off and trust Pip with the counter.

**What gets in her way**
- Takings are a single total. She cannot see a week against the last, or profit after losses to monsters.
- Reordering lives in her head and on scraps of paper.
- Promoting a patron to a higher tier is a judgement call with nothing to base it on.
- She is the only one who can close an incident, so they pile up when she is away.
- She cannot add a second clerk or change a password without help.

**Uses today.** The counter dashboard, takings and best sellers, adding and repricing tomes, membership tiers, resolving incidents.

**Would value most.** Backlog 1 (reorder levels), 5 (tier discounts), 7 (bounty board), 9 (staff management), 12 (orders from the scribes' guild).

**Journey to explore.** *Month-end.* Mirabel sits down to see how the month went, decide what to reorder, and choose who to promote to Fellow.

---

### Pip Underbough, clerk

> "There are six people waiting, one of them is on fire, and I cannot find the dwarf's name in the book."

**Who they are.** A young gnome, eight months into their first job. Quick, friendly, eager to do it right and anxious about getting it wrong. Usually alone at the counter when things go sideways.

**Comfort with the system.** High. Fast with it, and the first to notice when it makes them do something twice.

**What they are trying to do**
- Serve the queue quickly and get the price right.
- Find a patron or a tome in seconds.
- Report a monster properly, then get back to the customers.
- Know what they are and are not allowed to do, before they try it.

**What gets in their way**
- The patron list has no search. Finding one name in a long queue is slow.
- A sale is one tome at a time; a patron with five books means five trips through the form.
- No way to undo a mistake. A wrong sale stays wrong.
- They find out something is owner-only by being refused.
- When a patron asks "is my book in yet?" there is nowhere to look.

**Uses today.** Selling and restocking tomes, registering patrons, reporting incidents, the counter dashboard without the takings.

**Would value most.** Backlog 2 (search the guest book), 4 (stock ledger view), 8 (returns), 14 (all-or-nothing sales).

**Journey to explore.** *Saturday rush.* A patron Pip has not met wants three books, one of which is in the locked cabinet, while something is rustling in Poetry.

---

## Visitors and patrons

None of these people can sign in. Patrons exist only as records that staff keep. Backlog 13 (the patron's own page) would change that.

### Sir Aldric Fenn, first-time visitor

> "I was told there was a bookshop. I was not told it would bite."

**Who he is.** A human knight, recently posted to Emberhollow Keep. Earnest, literal, and not a natural reader. Came looking for a book on slaying dragons and was gently redirected.

**Comfort with the system.** Low. He will read the landing page once, on whatever is nearest, and decide in under a minute whether to visit.

**What he is trying to do**
- Find out whether the shop has what he wants before walking across town.
- Know when it is open and whether it is safe today.
- Not feel foolish for not knowing how bookshops work.

**What gets in his way**
- The shop window shows six favourites. He cannot search the catalog or ask for a subject.
- He cannot tell whether a tome is suitable for a beginner.
- "A little wary" is charming but does not tell him whether to bring his sword.
- There is no way to ask a question or ask the shop to hold a book.

**Uses today.** The public landing page: shop window, wards, opening hours.

**Would value most.** A public catalog search, plain guidance on shop status, a way to ask for a book to be held (part of backlog 13).

**Journey to explore.** *First visit.* From hearing about the shop, to the landing page, to walking in and becoming a registered patron.

---

### Grusha Ironjaw, regular patron

> "Fourteen copies. Same book. By Thursday. Yes, it is the one with the dryad."

**Who she is.** An orc from Redcliff Hold who runs the warband's book club. Organised, loud, loyal. Has strong opinions on romance novels and will share them. Buys in bulk, for other people, on a schedule.

**Comfort with the system.** She does not use it, and resents having to come in to find out what could have been a message.

**What she is trying to do**
- Get enough copies of one book for the whole club by a fixed day.
- Know what she has bought before, so the club does not repeat itself.
- Be recognised as a good customer.
- Return what the club did not like, without an argument.

**What gets in her way**
- She cannot see stock before making the trip. The shop rarely has fourteen of anything.
- No way to place an order ahead or reserve copies.
- Her loyalty earns a "regular" badge and nothing else.
- Returns are handled by negotiation. She negotiates well. Pip does not.

**Uses today.** Nothing directly. Staff record her purchases against her name.

**Would value most.** Backlog 5 (tier discounts), 8 (returns), 13 (her own page, with reservations). Bulk orders would be a new request.

**Journey to explore.** *Book club order.* Choosing next month's book, securing enough copies, collecting them, and returning the four nobody finished.

---

### Ilyana Moonwhisper, Fellow of the Griffin

> "I have been meaning to finish this chapter since the old queen's coronation. Do not rush me."

**Who she is.** An elven cartographer and author, three centuries into writing the third book of her trilogy. A patron since before Mirabel was born. Reads slowly, widely and in the shop. Considers the reading nook partly hers.

**Comfort with the system.** Indifferent. She expects the shop to remember her, and judges it on whether it does.

**What she is trying to do**
- Borrow rather than buy; she has run out of shelves.
- Consult the restricted tomes for her research, properly supervised.
- Be told when something in her field arrives.
- Have her long history with the shop mean something.

**What gets in her way**
- There is no lending. She must buy, or read standing up.
- The locked cabinet has no rules, so access depends on Mirabel's mood.
- Nobody tells her about new arrivals; she finds out by browsing.
- A Fellow and a newcomer get exactly the same service at the counter.

**Uses today.** Nothing directly. She is a patron record with the tier "fellow".

**Would value most.** Backlog 6 (locked cabinet rules), 10 (lending library), 11 (recommendations).

**Journey to explore.** *The long loan.* Borrowing a tome, forgetting it for a season, and what happens next between a Fellow and a late fee.

---

### Kessandra Dune, travelling patron

> "I am in town for two days. If it is not on the shelf I will see you in the spring."

**Who she is.** A human caravan guard on the Salt Road, passing through Emberhollow twice a year. Buys for the long road and for people along it. Decisive, short of time, often out of reach.

**Comfort with the system.** Would use it gladly, from the road, on a small device with a poor connection.

**What she is trying to do**
- Know before she arrives what is in stock.
- Have books set aside for the two days she is in town.
- Pick up the next volume of whatever she finished on the road.

**What gets in her way**
- Everything requires being in the shop during opening hours.
- Nobody remembers which volume she is up to; she has to.
- If a tome sells the day before she arrives, she waits six months.

**Uses today.** Nothing directly. She is a recently registered patron record.

**Would value most.** Backlog 13 (her own page, with reservations), 11 (recommendations, especially "next in the series"). Good mobile behaviour matters more to her than to anyone else.

**Journey to explore.** *Two days in town.* Reserving from the road, collecting in a hurry, and leaving with the right books.

---

## Partners and outsiders

People who work with the shop rather than buy from it. Apart from Orsolya, the system does not know they exist.

### Orsolya Brightscale, local author

> "You have sold three of mine this week! I have signed the rest. You are welcome."

**Who she is.** A dragonborn naturalist from Cinder Peak and author of *A Field Guide to Polite Dragons*, which has pride of place in the shop window. Proud, generous, and in the shop more often than strictly necessary.

**Comfort with the system.** Curious. Would check her sales daily if she could.

**What she is trying to do**
- Know how her book is selling and when it is running low.
- Arrange signings and have the shop tell patrons about them.
- Be paid her share, on time, without having to ask.

**What gets in her way**
- She learns her sales by asking Pip, who is not allowed to see the takings.
- Signings are arranged by turning up.
- Her share is worked out by Mirabel, by hand, eventually.

**Uses today.** Nothing directly. She is a patron record, and separately an author name on a tome; the system does not connect the two.

**Would value most.** New requests: an author's view of their own sales, consignment and royalty tracking, events. Related to backlog 13.

**Journey to explore.** *Launch day.* A new edition arrives, a signing is announced, and Orsolya wants to know by evening how it went.

---

### Quillon Vance, scribes' guild factor

> "Mistress Thistlewick orders when she remembers. I deliver when I can. It is not a system."

**Who he is.** A human factor (sales agent) for the Scribes' Guild, which copies and supplies most of the shop's stock. Careful, courteous, and responsible for forty shops across the vale.

**Comfort with the system.** High, with his own ledgers. He has never seen the shop's.

**What he is trying to do**
- Receive clear orders: which tomes, how many, by when.
- Plan the scribes' work; a copy takes weeks to make.
- Deliver, be acknowledged, and be paid.

**What gets in his way**
- Orders arrive by note, by word of mouth, or not at all.
- He hears about a shortage after the shelf is empty.
- A delivery is entered by staff as a "restock" with a free-text note. Nothing ties it to what was ordered.

**Uses today.** Nothing. His only trace is the phrase "Delivery from the scribes' guild" in the stock ledger.

**Would value most.** Backlog 12 (orders from the scribes' guild), supported by backlog 1 (reorder levels).

**Journey to explore.** *Order to shelf.* Stock runs low, an order is raised, the guild copies and delivers, and the shop receives it against the order.

---

### Bran Holloway, adventurer for hire

> "Three gold for a mimic is robbery. It had teeth on the inside."

**Who she is.** A human sellsword who leads a party of four working out of the Lantern Street tavern. Practical and blunt. Takes small jobs between large ones, and bookshop pests count as small.

**Comfort with the system.** None needed, as long as someone tells her where the monster is and what it pays.

**What she is trying to do**
- Find paying work without waiting about in the tavern.
- Know what she is walking into: what creature, how bad, where.
- Be paid the agreed price when the job is done.

**What gets in her way**
- She hears about incidents by rumour, often after another party has taken them.
- The price is agreed in a doorway and remembered differently by each side.
- Nothing records that her party did the job, so there is no reputation to build.

**Uses today.** Nothing. She appears only in an incident's resolution note: "Adventurers hired for 3 gp."

**Would value most.** Backlog 7 (bounty board). A way to see open bounties without a staff login would be a new request.

**Journey to explore.** *The bounty.* A dire incident is reported, a bounty is posted, Bran's party claims it, deals with it and is paid.

---

### Hesper Nightingale, wardwright

> "A ward does not fail. It is neglected, and then it stops."

**Who she is.** An elderly fae craftswoman who made the shop's four wards and renews them on a schedule only she knows. Meticulous, unhurried, slightly offended that nobody reads her notes.

**Comfort with the system.** Low interest, high standards. She will use it if it respects the craft.

**What she is trying to do**
- Inspect each ward on time and record its condition.
- Be called before a ward breaks, not after.
- Leave instructions that staff will actually follow.

**What gets in her way**
- Wards have a status that nobody can change. The Cellar Seal has been "flickering" since the demo data was written.
- No record of when a ward was last renewed or when it is next due.
- She cannot see which incidents happened near which ward, so cannot tell which wards are failing.

**Uses today.** Nothing. The wards she made are listed, read-only.

**Would value most.** Backlog 3 (ward upkeep). An inspection schedule and a link between incidents and wards would be new requests.

**Journey to explore.** *The new-moon round.* Hesper inspects all four wards, renews one, and flags another for attention.

---

### Magister Edda Farrow, guild auditor

> "I do not need to like your numbers. I need to be able to follow them."

**Who she is.** A dwarven auditor for the Emberhollow Merchants' Guild, which licenses the shop to trade and to hold restricted tomes. Fair, thorough and immune to charm. Visits once a year, with notice.

**Comfort with the system.** High. She has seen every way a ledger can be made to lie.

**What she is trying to do**
- Confirm that recorded takings match recorded sales.
- See who sold each restricted tome, to whom, and on whose authority.
- See who changed a price or a stock level, and when.
- Do all of this without being able to change anything herself.

**What gets in her way**
- There is no read-only access. To see the records she would need Mirabel's login.
- Stock changes are logged; price and catalog changes are not.
- Nothing records sign-ins, so she cannot tell who was at the counter.
- She cannot take the figures away with her.

**Uses today.** Nothing.

**Would value most.** Backlog 6 (locked cabinet rules), 16 (login hardening and sign-in audit). A read-only auditor role, a full change history and exports would be new requests.

**Journey to explore.** *The annual inspection.* Edda is given access for a day, traces three restricted sales end to end, and writes her findings.

---

## Using these personas

**To write a feature request.** Start from a persona and a moment in their day, not from a screen. "Pip, during the Saturday rush, needs to find a patron by name in a few seconds" leads to better elaboration than "add search to the patrons page".

**To test a feature request.** Ask of each one:
- Who is this for, and what could they not do before?
- Who else does it touch? A discount for Grusha changes what Mirabel sees in her takings and what Edda must be able to trace.
- What does each role need to be allowed, and refused?
- How would the persona know it worked?

**To plan a journey.** Each persona has one journey named above. A journey usually crosses several backlog items and several personas, which makes it a good way to choose what to build in what order.

**Roles the system would need.** Today there are two roles, `owner` and `clerk`, and anonymous visitors. Serving everyone here would mean adding, roughly in order of how often the backlog calls for them:

| New role | For | First needed by |
|---|---|---|
| Patron | Grusha, Ilyana, Kessandra, Aldric once registered | Backlog 13 |
| Supplier | Quillon | Backlog 12 |
| Contractor | Bran, Hesper | Backlog 7 and 3, if they act for themselves rather than through staff |
| Author | Orsolya | New request |
| Auditor (read-only) | Edda | New request |

**Keeping this document honest.** The "uses today" and "what gets in their way" sections describe the system as it stands. When a feature lands that removes a frustration, update the persona.
