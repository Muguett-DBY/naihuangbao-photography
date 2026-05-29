import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  to: string;
  label: string;
};

export function DetailBackLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--accent)",
        marginBottom: 16,
        fontSize: "0.9rem",
        textDecoration: "none",
      }}
    >
      <ArrowLeft size={16} /> {label}
    </Link>
  );
}
