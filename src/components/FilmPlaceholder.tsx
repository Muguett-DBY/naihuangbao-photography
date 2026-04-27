export function FilmPlaceholder({ title, tone = "rose" }: { title: string; tone?: "rose" | "sage" | "cream" | "ink" }) {
  return (
    <div className={`film-placeholder film-placeholder-${tone}`} aria-label={title}>
      <div className="film-grain" />
      <span>授权作品待上传</span>
      <strong>{title}</strong>
    </div>
  );
}
