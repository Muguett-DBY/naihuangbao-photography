import { PageTransition } from "./PageTransition";

type Props = {
  label?: string;
};

export function DetailLoading({ label = "Loading..." }: Props) {
  return (
    <PageTransition>
      <div style={{ textAlign: "center", padding: 120 }}>{label}</div>
    </PageTransition>
  );
}
