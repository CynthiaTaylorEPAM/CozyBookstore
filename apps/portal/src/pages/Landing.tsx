import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { BookCover } from '../components/BookCover';
import { Crest } from '../components/Crest';
import { ShopFront } from '../components/ShopFront';
import { MONSTERS, MOODS, RACES } from '../lore';
import { formatMoney } from '../money';
import type { PatronStats, ShopStatus, Tome } from '../types';
import { useLoad } from '../useLoad';

const TIERS = [
  { name: 'Wanderer', price: 'Free', perks: ['Browse as long as you like', 'A chair by the fire', 'Advice, whether wanted or not'] },
  { name: 'Regular', price: 'Earned by returning', perks: ['Your usual chair, remembered', 'First look at new arrivals', 'Tea, and sometimes a scone'] },
  { name: 'Fellow of the Griffin', price: 'By invitation of the owner', perks: ['A key to the reading nook', 'Supervised visits to the locked cabinet', 'Your name on the brass plaque'] },
];

const QUOTES = [
  { quote: 'I came in for one almanac and left three days later with eleven books and a new best friend.', who: 'Pim Butterburr', what: 'halfling, Greenhollow' },
  { quote: 'Adequate shelving. Stout floors. The poetry section made me weep, which I deny.', who: 'Thrain Emberforge', what: 'dwarf, the Deep Halls' },
  { quote: 'The mimic bit me. Five stars. The shopkeeper gave me tea and a book about it.', who: 'Sir Aldric Fenn', what: 'human, Emberhollow Keep' },
];

const HOURS = [
  ['Moonday to Fireday', 'First lantern to last candle'],
  ['Starday', 'Noon until the tea runs out'],
  ['Sunday', 'Closed. The books need rest too.'],
  ['During monster incidents', 'Open, but mind your fingers'],
];

export function Landing() {
  const { staff } = useAuth();
  // Live data from the three services. If a service is down the page still reads well.
  const tomes = useLoad<Tome[]>('/public/tomes');
  const stats = useLoad<PatronStats>('/public/patron-stats');
  const status = useLoad<ShopStatus>('/public/shop-status');

  const staffLink = staff ? '/shop' : '/login';
  const mood = status.data ? MOODS[status.data.mood] : null;
  const countByRace = new Map(stats.data?.byRace.map((row) => [row.race, row.count]));

  return (
    <div className="landing">
      <header className="hero">
        <nav className="hero__nav">
          <a href="#top" className="hero__brand">
            <Crest size={44} />
            <span>
              The Gilded Griffin
              <small>Books &amp; Curios · Emberhollow</small>
            </span>
          </a>
          <div className="hero__links">
            <a href="#window">Shop window</a>
            <a href="#folk">Our patrons</a>
            <a href="#wards">Wards &amp; monsters</a>
            <a href="#visit">Visit</a>
            <Link to={staffLink} className="button button--gold">
              {staff ? 'Back to the counter' : 'Staff door'}
            </Link>
          </div>
        </nav>

        <div className="hero__body" id="top">
          <div className="hero__copy">
            <p className="eyebrow eyebrow--gold">Est. in the Year of the Quiet Comet</p>
            <h1>
              Stories for every folk.
              <br />
              <em>Shelter from every storm.</em>
            </h1>
            <p className="hero__lede">
              Elves, dwarves, halflings, orcs and the occasional polite dragon have warmed their hands at our hearth for
              generations. Come in, find a chair, and let the right book find you.
            </p>
            <div className="hero__actions">
              <a href="#window" className="button button--gold button--large">
                Peek in the shop window
              </a>
              <a href="#visit" className="button button--ghost button--large">
                Plan a visit
              </a>
            </div>
            {status.data && mood && (
              <a href="#wards" className={`status-pill status-pill--${status.data.mood}`}>
                <span className="status-pill__dot" />
                <span>
                  <strong>Tonight: {mood.label.toLowerCase()}.</strong> {status.data.wards.filter((w) => w.status === 'holding').length} of{' '}
                  {status.data.wards.length} wards holding
                  {status.data.openIncidents > 0 && `, ${status.data.openIncidents} ${status.data.openIncidents === 1 ? 'creature' : 'creatures'} being dealt with`}
                  .
                </span>
              </a>
            )}
          </div>
          <ShopFront />
        </div>
      </header>

      <div className="ribbon" aria-hidden="true">
        <span>✦ Rare tomes</span>
        <span>✦ Scrolls &amp; maps</span>
        <span>✦ Fireproof reading nook</span>
        <span>✦ Tea always on</span>
        <span>✦ Monsters dealt with promptly</span>
      </div>

      <section className="section" id="window">
        <p className="eyebrow">In the shop window</p>
        <h2>This season's favourites</h2>
        <p className="section__lede">Hand-picked by the proprietor. Prices in gold, silver and copper; haggling is tolerated on Stardays.</p>
        <div className="window-grid">
          {(tomes.data ?? []).map((tome) => (
            <article key={tome.id} className="window-item">
              <BookCover title={tome.title} author={tome.author} genre={tome.genre} />
              <div className="window-item__text">
                <span className="tag">{tome.genre}</span>
                <h3>{tome.title}</h3>
                <p className="muted">by {tome.author}</p>
                <p>{tome.description}</p>
                <p className="window-item__price">
                  {formatMoney(tome.priceCp)}
                  <span className={tome.stock > 0 ? 'in-stock' : 'out-of-stock'}>{tome.stock > 0 ? `${tome.stock} on the shelf` : 'Sold out'}</span>
                </p>
              </div>
            </article>
          ))}
          {tomes.error && <p className="muted">The window is fogged up just now. Come inside and ask.</p>}
        </div>
      </section>

      <section className="section section--tinted" id="folk">
        <p className="eyebrow">All folk welcome</p>
        <h2>
          {stats.data ? `${stats.data.totalPatrons} patrons of ${stats.data.byRace.length} folk` : 'Patrons of every folk'}, one guest book
        </h2>
        <p className="section__lede">
          Tall shelves have ladders, low shelves have cushions, and the reading nook has survived at least four dragonborn sneezes.
        </p>
        <div className="folk-grid">
          {Object.entries(RACES).map(([race, info]) => (
            <div key={race} className="folk">
              <span className="folk__icon">{info.icon}</span>
              <strong>{info.label}</strong>
              <p>{info.blurb}</p>
              {countByRace.get(race) ? <span className="folk__count">{countByRace.get(race)} in the guest book</span> : <span className="folk__count folk__count--none">Not yet. Be the first.</span>}
            </div>
          ))}
        </div>

        <div className="tier-grid">
          {TIERS.map((tier, index) => (
            <div key={tier.name} className={`tier${index === 2 ? ' tier--fellow' : ''}`}>
              <h3>{tier.name}</h3>
              <p className="tier__price">{tier.price}</p>
              <ul>
                {tier.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--night" id="wards">
        <p className="eyebrow eyebrow--gold">Wards &amp; monsters</p>
        <h2>Occasionally beset. Never closed.</h2>
        <p className="section__lede">
          A shop full of old magic attracts the odd pest. Our wards are checked nightly, and every incident is logged and dealt with.
        </p>
        <div className="wards-layout">
          <div className="wards-card">
            <h3>The wards tonight</h3>
            {mood && <p className="wards-card__mood">{mood.line}</p>}
            <ul>
              {(status.data?.wards ?? []).map((ward) => (
                <li key={ward.name} className={`ward ward--${ward.status}`}>
                  <span className="ward__dot" />
                  <div>
                    <strong>{ward.name}</strong>
                    <span>{ward.location}</span>
                  </div>
                  <em>{ward.status}</em>
                </li>
              ))}
            </ul>
            {status.error && <p>The ward-keeper is not answering. Probably fine.</p>}
          </div>
          <div className="bestiary">
            {Object.entries(MONSTERS).map(([monster, info]) => (
              <div key={monster} className="beast">
                <span>{info.icon}</span>
                <div>
                  <strong>{monster}</strong>
                  <p>{info.habit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow">Overheard at the counter</p>
        <h2>Kind words from kind folk</h2>
        <div className="quote-grid">
          {QUOTES.map((item) => (
            <figure key={item.who} className="quote">
              <blockquote>“{item.quote}”</blockquote>
              <figcaption>
                <strong>{item.who}</strong>
                <span>{item.what}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section section--tinted" id="visit">
        <div className="visit">
          <div>
            <p className="eyebrow">Find us</p>
            <h2>Third lantern past the fountain</h2>
            <p>
              No. 7 Lantern Street, Emberhollow. Look for the sign of the winged book. If the building seems to have moved, wait a
              moment; it does that.
            </p>
            <p>
              <strong>Proprietor:</strong> Mirabel Thistlewick &nbsp;·&nbsp; <strong>Clerk:</strong> Pip Underbough &nbsp;·&nbsp; <strong>Cash box:</strong> a reformed mimic
            </p>
          </div>
          <table className="hours">
            <tbody>
              {HOURS.map(([day, hours]) => (
                <tr key={day}>
                  <th>{day}</th>
                  <td>{hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__brand">
          <Crest size={36} />
          <span>The Gilded Griffin · Books &amp; Curios</span>
        </div>
        <p>A demonstration bookshop. Any resemblance to real dragons is coincidental.</p>
        <Link to={staffLink} className="footer__door">
          🚪 Staff door
        </Link>
      </footer>
    </div>
  );
}
