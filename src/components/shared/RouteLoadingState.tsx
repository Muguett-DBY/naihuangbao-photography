export function RouteLoadingState() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-index">NHB / LOADING</span>
      <span className="route-loading-rule" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
