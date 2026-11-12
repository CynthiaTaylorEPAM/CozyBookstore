# Backlog

Feature requests for the hyperfactory, written the way a shop owner would ask for them. They are ordered roughly from small to large. Each names the parts of the system it is likely to touch, so you can pick one that shows what you want to show.

The people behind these requests, and further requests the list does not yet cover, are in [personas.md](personas.md).

## Small: one service and one screen

1. **Low-stock threshold per tome.** "Some tomes I want to reorder at five copies, others at one." Add a reorder level to each tome and use it on the counter's Running Low panel instead of the fixed value of 2. *Catalog, portal.*
2. **Search the guest book.** "I can never find a patron when the queue is out the door." Search and filter patrons by name, folk and tier. *Patrons, portal.*
3. **Ward upkeep.** "Let me mark a ward as flickering or mended." The owner can change a ward's status, and a broken ward makes the shop's mood at least wary. *Incidents, portal.*
4. **Stock ledger view.** "Show me why we only have two copies left." A tome detail page showing its stock history. The API already exists. *Portal only.*

## Medium: business rules, more than one service

5. **Griffin's Favour discounts.** "Regulars get 5% off, Fellows get 10%." Apply the tier discount at sale time, show it on the sale, round in the shop's favour to the nearest copper. *Patrons, portal.*
6. **Locked cabinet rules.** "Only Fellows may buy restricted tomes, and only I may sell them." Enforce both rules and explain refusals clearly. *Patrons, catalog, portal.*
7. **Bounty board.** "For a dire incident I want to post a bounty for adventurers." Add a bounty in gold to an incident, record who claimed it, and include bounties paid in the owner's figures. *Incidents, portal.*
8. **Returns.** "Grusha wants to return a romance novel. Again." Refund a sale in full or in part and put the copies back on the shelf. *Patrons, catalog, portal.*
9. **Staff management.** "I have hired a second clerk." The owner can add staff, reset passwords and deactivate accounts. Staff can change their own password. *Gateway, portal.*

## Large: new capability

10. **Lending library and late fees.** "Fellows may borrow up to three tomes for a fortnight. After that it is 2 copper a day." Loans, due dates, returns, fees, and an overdue list on the counter. *Patrons, catalog, portal.*
11. **Reading recommendations.** "When I open a patron's page, suggest three tomes they might like." Based on their purchase history and what similar patrons bought. *Patrons, catalog, portal.*
12. **Orders from the scribes' guild.** "When stock runs low, draft me a purchase order." Suppliers, purchase orders, receiving deliveries into stock. *New service, catalog, portal.*
13. **The patron's own page.** "Patrons should be able to see their purchases and reserve a tome from home." A patron login separate from staff, with reservations. *Gateway, patrons, catalog, portal.*

## Technical

14. **Make a sale all-or-nothing.** If recording a sale fails after stock was taken, put the stock back. *Patrons, catalog.*
15. **Generated API contract.** Publish an OpenAPI description from each service and generate the portal's types from it. *All services, portal.*
16. **Login hardening.** Rate-limit sign-in attempts and add an audit log of sign-ins. *Gateway.*

## From the personas

Requests that came out of writing the [personas](personas.md). They are numbered on from the list above so that existing numbers stay stable. Each says who it is for and how big it is.

### Small

17. **Plain-speaking shop status.** For Sir Aldric. "Just tell me whether to bring my sword." Alongside the mood, the landing page gives plain advice for a visitor: safe to visit, visit with care, or come back tomorrow. *Incidents, portal.*
18. **Search the public catalog.** For Sir Aldric and Kessandra. "Do you have anything on dragons, or not?" Anyone can search the unrestricted tomes by title, author or genre and see whether they are in stock, without signing in. *Catalog, gateway, portal.*

### Medium

19. **Sell several tomes in one sale.** For Pip. "She has five books and there are six people behind her." Add tomes to a single sale, see the running total, and ring it up once. If any tome is short, nothing is sold. *Patrons, catalog, portal.*
20. **Takings over time, and the cost of monsters.** For Mirabel. "Was this month better than last, and what did that bookwyrm cost me?" Takings week by week and month by month, with the value of stock lost to incidents set against them. *Patrons, incidents, catalog, portal.*
21. **Minding the shop.** For Mirabel and Pip. "When I am away, Pip may close incidents, and only then." The owner can hand a named clerk specific owner duties for a set period, and see afterwards what was done in her name. *Gateway, incidents, portal.*
22. **Ward inspections.** For Hesper. "A ward is renewed every new moon, and somebody should write it down." Record each inspection with its date, findings and next due date; show overdue wards on the counter; link an incident to the ward nearest to it so failing wards stand out. Builds on item 3. *Incidents, portal.*
23. **Public bounty notices.** For Bran. "I should not have to hear about paying work from the tavern keeper." Open bounties appear on the public site with the creature, severity and reward, but no private details. Builds on item 7. *Incidents, gateway, portal.*

### Large

24. **Group orders.** For Grusha. "Fourteen copies, by Thursday." Order more copies than the shop holds, for a set date: the shop confirms what it can supply from the shelf and what must come from the scribes, holds the copies, and marks the order collected. Works best with items 12 and 13. *Patrons, catalog, portal.*
25. **The author's corner.** For Orsolya. "How is my book doing, and when am I paid?" Link an author to their tomes; give them a sign-in showing copies sold and their share owed; let the shop record payments and announce signings on the landing page. *Gateway, catalog, patrons, portal. New role.*
26. **Auditor access.** For Magister Farrow. "I need to follow your numbers without being able to touch them." A read-only role granted for a limited time; a history of who changed each price, tome and tier; and the ability to take sales and stock records away as a file. Builds on item 16. *Gateway, all services, portal. New role.*
