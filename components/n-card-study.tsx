"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Rating, type Grade } from "ts-fsrs";
import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import Dots from "@/components/dots";

type NCardStudyProps =
  | { isPlaceholder: true }
  | {
      isPlaceholder?: never;
      front: string;
      back: string;
      onRate: (rating: Grade) => void;
      ratingPending: boolean;
      pendingRating: Grade | null;
      againLabel: string;
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
  pendingRating: null,
  againLabel: "<1m",
  hardLabel: "1d",
  goodLabel: "3d",
  easyLabel: "5d",
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
  const faceBase = "flex flex-col p-4 md:p-8 rounded-2xl select-none";

  return (
    <div
      data-placeholder={isPlaceholder ? "true" : undefined}
      data-grabbing={isGrabbing ? "true" : undefined}
      data-is-back={isBack ? "true" : undefined}
      className="w-full group touch-pan-y perspective-distant md:perspective-[1600px] data-grabbing:cursor-grabbing cursor-grab data-is-back:cursor-default"
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
            "border border-border bg-card shadow-lg overflow-hidden flex flex-col items-center",
          )}
        >
          <p className="max-w-full shrink min-w-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5 text-center relative z-10 group-data-placeholder:text-transparent group-data-placeholder:bg-muted-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
            Front
          </p>
          <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 py-6 min-h-[calc((100svh-80px)*0.35)]">
            <p className="max-w-full text-2xl font-medium text-foreground break-words text-center group-data-placeholder:text-transparent group-data-placeholder:bg-foreground/15 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
              {isPlaceholder ? "Front text" : props.front}
            </p>
            <p className="max-w-full text-xl text-foreground/80 break-words text-center opacity-0">
              {isPlaceholder ? "Back text" : props.back}
            </p>
          </div>
          {/* Invisible buttons — keep layout identical to back face */}
          <RatingButtons
            visible={false}
            {...(isPlaceholder ? placeholderProps : props)}
          />
          <p className="text-xs text-muted-foreground text-center relative z-10 select-none group-data-placeholder:text-transparent group-data-placeholder:bg-muted-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
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
              "border overflow-hidden border-border bg-card shadow-lg",
            )}
          >
            <Dots />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5 text-center relative">
              Back
            </p>
            <div className="w-full flex-1 flex flex-col items-center justify-center py-6 min-h-[120px] relative">
              <p className="max-w-full text-xl text-foreground/80 break-words text-center">
                {isPlaceholder ? "Back text" : props.back}
              </p>
              <p className="opacity-0 max-w-full text-2xl font-medium text-transparent break-words text-center">
                {isPlaceholder ? "Front text" : props.front}
              </p>
            </div>
            {/* Invisible placeholder — matches "Tap or drag to flip" line height */}
            <p className="text-xs text-center mt-1 mb-0 opacity-0 select-none relative">
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
  pendingRating: Grade | null;
  onRate: (rating: Grade) => void;
  againLabel: string;
  hardLabel: string;
  goodLabel: string;
  easyLabel: string;
};

function RatingButtons({
  visible,
  ratingPending,
  pendingRating,
  onRate,
  againLabel,
  hardLabel,
  goodLabel,
  easyLabel,
}: RatingButtonsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 transition-opacity duration-150 relative",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <Button
        variant="outline"
        className="h-auto py-2.5 md:py-3 flex flex-col gap-0.5 bg-rating-again border-rating-again-border hover:bg-rating-again-border hover:text-rating-again-hover"
        onClick={(e) => {
          e.stopPropagation();
          onRate(Rating.Again);
        }}
        isPending={ratingPending && pendingRating === Rating.Again}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Again</span>
        <span className="text-xs opacity-70">{againLabel}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-2.5 md:py-3 flex flex-col gap-0.5 bg-rating-hard border-rating-hard-border hover:bg-rating-hard-border hover:text-rating-hard-hover"
        onClick={(e) => {
          e.stopPropagation();
          onRate(Rating.Hard);
        }}
        isPending={ratingPending && pendingRating === Rating.Hard}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Hard</span>
        <span className="text-xs opacity-70">{hardLabel}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-2.5 md:py-3 flex flex-col gap-0.5 bg-rating-good border-rating-good-border hover:bg-rating-good-border hover:text-rating-good-hover"
        onClick={(e) => {
          e.stopPropagation();
          onRate(Rating.Good);
        }}
        isPending={ratingPending && pendingRating === Rating.Good}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Good</span>
        <span className="text-xs opacity-70">{goodLabel}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto py-2.5 md:py-3 flex flex-col gap-0.5 bg-rating-easy border-rating-easy-border hover:bg-rating-easy-border hover:text-rating-easy-hover"
        onClick={(e) => {
          e.stopPropagation();
          onRate(Rating.Easy);
        }}
        isPending={ratingPending && pendingRating === Rating.Easy}
        disabled={ratingPending}
      >
        <span className="font-bold text-sm">Easy</span>
        <span className="text-xs opacity-70">{easyLabel}</span>
      </Button>
    </div>
  );
}
