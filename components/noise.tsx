import { cn } from "@/lib/utils";

type TProps = {
  className?: string;
};

export default function Noise({ className }: TProps) {
  return (
    <div
      className={cn(
        "w-full h-full absolute left-0 top-0 opacity-50 sepia-100",
        className,
      )}
    >
      <div className="w-full h-full noise">
        <svg className="absolute w-0 h-0 left-0 top-0 pointer-events-none">
          <filter id="noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="turbulence" baseFrequency="0.6" />
          </filter>
        </svg>
      </div>
    </div>
  );
}
