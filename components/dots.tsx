import { cn } from "@/lib/utils";

type TProps = {
  className?: string;
};

export default function Dots({ className }: TProps) {
  return (
    <div
      style={{
        backgroundColor: "transparent",
        backgroundImage:
          "radial-gradient(var(--dot) 0.5px, transparent 0.5px), radial-gradient(var(--dot) 0.5px, transparent 0.5px)",
        backgroundSize: "8px 8px",
        backgroundPosition: "0 0,4px 4px",
      }}
      className={cn(
        "absolute left-0 top-0 w-full h-full pointer-events-none",
        className,
      )}
    />
  );
}
