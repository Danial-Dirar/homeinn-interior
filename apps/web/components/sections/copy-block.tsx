/**
 * A titled block of prose that disappears when it has nothing to say.
 *
 * Used for the five profile blocks on /about. Their source is the company
 * profile PDF and it is not in this repository, so both message catalogues
 * carry them as empty strings and every one of these blocks is currently
 * invisible. Fill the message and the block appears — no code change.
 */
export function CopyBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;

  return (
    <div className="max-w-2xl">
      <h2 className="heading">{title}</h2>
      <p className="mt-3 text-ink/70">{body}</p>
    </div>
  );
}
