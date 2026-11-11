import { GENRE_COLOURS } from '../lore';

/** A small painted book cover, coloured by genre. */
export function BookCover({ title, author, genre, small = false }: { title: string; author: string; genre: string; small?: boolean }) {
  return (
    <div className={`book-cover${small ? ' book-cover--small' : ''}`} style={{ background: GENRE_COLOURS[genre] ?? '#5a4632' }}>
      {!small && (
        <>
          <span className="book-cover__ornament">❦</span>
          <span className="book-cover__title">{title}</span>
          <span className="book-cover__author">{author}</span>
        </>
      )}
    </div>
  );
}
