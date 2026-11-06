import Image from "next/image";

export default function ProfileAvatar({
  name,
  pictureUrl,
  className = "",
}: {
  name: string;
  pictureUrl: string | null;
  className?: string;
}) {
  return (
    <span className={`profile-avatar ${className}`}>
      {pictureUrl
        ? <Image alt="" height={80} src={pictureUrl} unoptimized width={80} />
        : <span aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "?"}</span>}
    </span>
  );
}
