import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export default function CardsIcon({ className, style }: ComponentProps<"svg">) {
  return (
    <svg
      style={style}
      className={cn("size-5 shrink-0 relative", className)}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.28016 19.3341L18.0467 20.1011C18.927 20.1781 19.6963 19.6033 19.7651 18.8174L20.8234 6.72072C20.8922 5.93475 20.2343 5.23515 19.354 5.15814L14.9708 4.77465M4.64933 4.66378L13.4158 3.89681C14.2961 3.8198 15.0655 4.39452 15.1343 5.1805L16.1926 17.2771C16.2613 18.0631 15.6035 18.7627 14.7232 18.8397L5.95666 19.6067C5.07637 19.6837 4.30701 19.109 4.23824 18.323L3.17992 6.22637C3.11116 5.44039 3.76903 4.7408 4.64933 4.66378Z"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
