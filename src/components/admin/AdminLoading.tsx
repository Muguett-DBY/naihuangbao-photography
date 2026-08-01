type AdminLoadingProps = {
  label?: string;
};

export function AdminLoading({ label = "加载中" }: AdminLoadingProps) {
  return (
    <div className="adm-loading-indicator" role="status" aria-live="polite">
      <span className="adm-loading-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
