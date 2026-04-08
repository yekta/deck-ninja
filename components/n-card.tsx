"use client";

import Dots from "@/components/dots";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

type NCardProps =
  | { isPlaceholder: true }
  | {
      isPlaceholder?: never;
      id: string;
      front: string;
      back: string;
      onEdit: () => void;
      onDelete: () => void;
    };

export function NCard(props: NCardProps) {
  const { isPlaceholder } = props;

  const front = isPlaceholder ? "This is the front of the card" : props.front;
  const back = isPlaceholder ? "This is the back of the card" : props.back;

  return (
    <div
      className="group relative rounded-xl border border-border bg-card shadow-md overflow-hidden group-data-placeholder:border-skeleton"
      data-placeholder={isPlaceholder || undefined}
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <Dots />
      {/* Menu */}
      {!isPlaceholder && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent h-8 w-8 shrink-0 focus-visible:outline-none">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={props.onEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit Card
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={props.onDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Front */}
      <div className="w-full flex flex-col items-start px-5 pt-5 pb-4 relative bg-card">
        <p className="shrink max-w-full min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          Front
        </p>
        <p className="shrink max-w-full min-w-0 text-sm text-foreground line-clamp-3 break-words font-medium leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {front}
        </p>
      </div>

      {/* Divider — ruled line style */}
      <div className="w-full h-px bg-border relative z-10" />

      {/* Back */}
      <div className="px-5 pt-3 pb-5 relative w-full flex flex-col items-start">
        <p className="shrink max-w-full min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          Back
        </p>
        <p className="shrink max-w-full min-w-0 text-sm text-foreground/80 line-clamp-3 break-words leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {back}
        </p>
      </div>
    </div>
  );
}
