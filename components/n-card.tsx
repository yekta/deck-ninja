"use client";

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
      className="group relative rounded-xl border border-amber-200/80 bg-[#FEFDF8] shadow-md overflow-hidden group-data-placeholder:border-slate-200"
      data-placeholder={isPlaceholder || undefined}
      style={{
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Corner fold */}
      <div
        className="absolute top-0 right-0 w-0 h-0 pointer-events-none group-data-placeholder:opacity-0"
        style={{
          borderStyle: "solid",
          borderWidth: "0 20px 20px 0",
          borderColor: "transparent #e8e0c8 transparent transparent",
        }}
      />

      {/* Menu */}
      {!isPlaceholder && (
        <div className="absolute top-2 right-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-amber-100 h-8 w-8 shrink-0 focus-visible:outline-none">
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={props.onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Card
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={props.onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Front */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/70 mb-2 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          Front
        </p>
        <p className="text-sm text-slate-900 line-clamp-3 break-words font-medium leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {front}
        </p>
      </div>

      {/* Divider — ruled line style */}
      <div className="mx-5 border-t border-dashed border-amber-200 group-data-placeholder:border-slate-200" />

      {/* Back */}
      <div className="px-5 pt-3 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          Back
        </p>
        <p className="text-sm text-slate-700 line-clamp-3 break-words leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {back}
        </p>
      </div>
    </div>
  );
}
