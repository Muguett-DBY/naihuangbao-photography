import { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  to: string;
  label: string;
};

export const DetailBackLink = memo(function DetailBackLink({ to, label }: Props) {
  return (
    <Link
      to={to}
      className="detail-back-link"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {label}
    </Link>
  );
});
