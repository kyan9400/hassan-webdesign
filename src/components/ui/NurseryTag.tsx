/** Plant-nursery price tag (pure CSS, see `.nursery-tag` in globals.css). */
export function NurseryTag({ children }: { children: string }) {
  return <span className="nursery-tag">{children}</span>;
}
