# Backlog

Feature requests for the hyperfactory, written the way a shop owner would ask for them. They are ordered roughly from small to large. Each names the parts of the system it is likely to touch, so you can pick one that shows what you want to show.

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
