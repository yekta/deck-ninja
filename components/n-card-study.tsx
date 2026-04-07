"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";

type RatingQuality = 1 | 3 | 4 | 5;

type NCardStudyProps =
  | { isPlaceholder: true }
  | {
      isPlaceholder?: never;
      front: string;
      back: string;
      onRate: (quality: RatingQuality) => void;
      ratingPending: boolean;
      pendingQuality: RatingQuality | null;
      hardLabel: string;
      goodLabel: string;
      easyLabel: string;
    };

const FLIP_THRESHOLD = 72; // degrees past which we complete the flip
const PX_PER_DEG = 150 / 180; // px of drag per degree of rotation (150px = full 180°)

/** iOS-style rubber-band resistance past ±180°. k controls stiffness — higher = harder to pull. */
function rubberBand(raw: number): number {
  const limit = 180;
  const abs = Math.abs(raw);
  if (abs <= limit) return raw;
  const sign = raw > 0 ? 1 : -1;
  const excess = abs - limit;
  const k = 0.055; // very stiff — barely any give past the limit
  return sign * (limit + excess / (1 + excess * k));
}

const placeholderProps: Omit<RatingButtonsProps, "visible"> = {
  isPlaceholder: true,
  onRate: () => {},
  ratingPending: false,
  pendingQuality: null,
  easyLabel: "5d",
  goodLabel: "3d",
  hardLabel: "1d",
};

export function NCardStudy(props: NCardStudyProps) {
  const { isPlaceholder } = props;

  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isBack, setIsBack] = useState(false);

  // The canonical Y rotation angle (0 = front, ±180 = back)
  const rotateY = useMotionValue(0);
  const frontOpacity = useTransform(rotateY, (v) => (Math.abs(v) < 90 ? 1 : 0));
  const backOpacity = useTransform(rotateY, (v) => (Math.abs(v) >= 90 ? 1 : 0));
  const baseAngle = useRef(0); // 0 or ±180 — updated on flip commit
  const dragStartX = useRef(0);
  const pointerDown = useRef(false);
  const didDrag = useRef(false);

  const springTo = (target: number) =>
    animate(rotateY, target, { type: "spring", stiffness: 360, damping: 40 });

  const commitFlip = (targetAngle: number) => {
    baseAngle.current = targetAngle;
    springTo(targetAngle);
    setIsBack(targetAngle !== 0);
  };

  /* ─── Pointer handlers ─── */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPlaceholder) return;
    // Don't interfere with button clicks
    if ((e.target as HTMLElement).closest("button")) return;
    // Back face is locked — must use buttons to rate
    if (baseAngle.current !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    pointerDown.current = true;
    didDrag.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDown.current) return;
    const dx = e.clientX - dragStartX.current;
    if (!didDrag.current && Math.abs(dx) > 4) {
      didDrag.current = true;
      setIsGrabbing(true);
    }
    if (didDrag.current) {
      rotateY.set(rubberBand(baseAngle.current + dx / PX_PER_DEG));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    setIsGrabbing(false);

    const dx = e.clientX - dragStartX.current;
    const base = baseAngle.current; // always 0 here (back face blocks entry)
    const diff = rotateY.get() - base;

    if (!didDrag.current) {
      // Pure tap — flip to back
      commitFlip(180);
      return;
    }

    if (Math.abs(diff) >= FLIP_THRESHOLD) {
      // Complete the flip in the direction dragged
      commitFlip(dx > 0 ? 180 : -180);
    } else {
      // Not far enough — spring back to front
      springTo(base);
    }
  };

  const onPointerCancel = () => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    setIsGrabbing(false);
    springTo(baseAngle.current);
  };

  /* ─── Shared face structure ─── */
  const faceBase = "flex flex-col p-8 rounded-2xl select-none";

  return (
    <div
      data-placeholder={isPlaceholder ? "true" : undefined}
      className="w-full group"
      style={{
        perspective: "1400px",
        cursor: isGrabbing ? "grabbing" : isBack ? "default" : "grab",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <motion.div
        style={{ rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full"
      >
        {/* ─── Front face ─── */}
        <motion.div
          style={{ backfaceVisibility: "hidden", opacity: frontOpacity }}
          className={cn(
            faceBase,
            "border border-amber-200/60 bg-[#FEFDF8] shadow-lg overflow-hidden flex flex-col items-center",
          )}
        >
          <p className="max-w-full shrink min-w-0 text-xs font-semibold uppercase tracking-widest text-amber-500/60 mb-5 text-center relative z-10 group-data-placeholder:text-transparent group-data-placeholder:bg-amber-500/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
            Front
          </p>
          <div className="flex-1 flex items-center justify-center relative z-10 py-6 min-h-[120px]">
            <p className="text-2xl font-medium text-slate-900 break-words text-center group-data-placeholder:text-transparent group-data-placeholder:bg-slate-900/15 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
              {isPlaceholder ? "Front text" : props.front}
            </p>
          </div>
          {/* Invisible buttons — keep layout identical to back face */}
          <RatingButtons
            visible={false}
            {...(isPlaceholder ? placeholderProps : props)}
          />
          <p className="text-xs text-slate-400 text-center relative z-10 select-none group-data-placeholder:text-transparent group-data-placeholder:bg-slate-400/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
            Tap or drag to flip
          </p>
        </motion.div>

        {/* ─── Back face ─── */}
        {!isPlaceholder && (
          <motion.div
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              position: "absolute",
              inset: 0,
              opacity: backOpacity,
            }}
            className={cn(
              faceBase,
              "border border-slate-200 bg-white shadow-lg",
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5 text-center">
              Back
            </p>
            <div className="flex-1 flex items-center justify-center py-6 min-h-[120px]">
              <p className="text-xl text-slate-700 break-words text-center">
                {isPlaceholder ? "Back text" : props.back}
              </p>
            </div>
            {/* Invisible placeholder — matches "Tap or drag to flip" line height */}
            <p className="text-xs text-center mt-1 mb-0 opacity-0 select-none">
              placeholder
            </p>
            {/* Visible rating buttons */}
            <RatingButtons visible={true} {...props} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

type RatingButtonsProps = {
  isPlaceholder?: boolean;
  visible: boolean;
  ratingPending: boolean;
  pendingQuality: RatingQuality | null;
  onRate: (quality: RatingQuality) => void;
  hardLabel: string;
  goodLabel: string;
  easyLabel: string;
};

function RatingButtons({
  visible,
  ratingPending,
  pendingQuality,
  onRate,
  hardLabel,
  goodLabel,
  easyLabel,
}: RatingButtonsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <Button
        variant="outline"
        className="h-auto py-3 flex flex-col gap-0.5 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-700"
        onClick={(e) => {
          e.stopPropagation();
          onRate(1);
        }}
        isPending={ratingPending && pendingQuality === 1}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Again</span>
        <span className="text-xs opacity-70">&lt; 1m</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-3 flex flex-col gap-0.5 bg-orange-50 border-orange-200 hover:bg-orange-100 hover:text-orange-700"
        onClick={(e) => {
          e.stopPropagation();
          onRate(3);
        }}
        isPending={ratingPending && pendingQuality === 3}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Hard</span>
        <span className="text-xs opacity-70">{hardLabel}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-3 flex flex-col gap-0.5 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
        onClick={(e) => {
          e.stopPropagation();
          onRate(4);
        }}
        isPending={ratingPending && pendingQuality === 4}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Good</span>
        <span className="text-xs opacity-70">{goodLabel}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-3 flex flex-col gap-0.5 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-700"
        onClick={(e) => {
          e.stopPropagation();
          onRate(5);
        }}
        isPending={ratingPending && pendingQuality === 5}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Easy</span>
        <span className="text-xs opacity-70">{easyLabel}</span>
      </Button>
    </div>
  );
}
