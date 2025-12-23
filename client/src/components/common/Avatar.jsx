import React from "react";
import { initialsFromUser, isValidAvatarUrl } from "../../utils/avatar";

export default function Avatar({ user, size = 32, className = "" }) {
  const url = user?.avatarUrl;
  const initials = initialsFromUser(user);

  const px = typeof size === "number" ? `${size}px` : size;

  if (isValidAvatarUrl(url)) {
    return (
      <img
        src={url}
        alt="avatar"
        className={`rounded-full object-cover border border-gray-800 ${className}`}
        style={{ width: px, height: px }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          // fallback will render via parent rerender if you want; simplest is keep it hidden and show initials below is more work.
        }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center border border-gray-800 bg-gray-950 text-gray-200 font-semibold ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(12, Number(size) * 0.38) }}
      title={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
    >
      {initials}
    </div>
  );
}
