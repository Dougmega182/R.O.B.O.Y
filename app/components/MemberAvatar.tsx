"use client";

type MemberAvatarProps = {
  avatar?: string | null;
  color?: string;
  className?: string;
  textClassName?: string;
  alt?: string;
};

function isImageAvatar(value?: string | null) {
  return !!value && /^(https?:)?\/\//.test(value);
}

export default function MemberAvatar({
  avatar,
  color = "bg-gray-400",
  className = "",
  textClassName = "",
  alt = "Avatar",
}: MemberAvatarProps) {
  const initials = (avatar || "?").slice(0, 2).toUpperCase();

  if (isImageAvatar(avatar)) {
    return (
      <div className={`overflow-hidden bg-gray-100 ${className}`}>
        <img src={avatar || ""} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center text-white ${color} ${className} ${textClassName}`}>
      {initials}
    </div>
  );
}
