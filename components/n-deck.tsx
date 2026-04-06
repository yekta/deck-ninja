"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

interface NDeckProps {
  id: string;
  name: string;
  description?: string;
  totalCards: number;
  newCount: number;
  learningCount: number;
  dueCount: number;
  isRecentlyUpdated: boolean;
  studyHref: string;
  manageHref: string;
  onAddCard: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function NDeck({
  name,
  description,
  totalCards,
  newCount,
  learningCount,
  dueCount,
  isRecentlyUpdated,
  studyHref,
  manageHref,
  onAddCard,
  onRename,
  onDelete,
}: NDeckProps) {
  return (
    <div className="relative pt-3 pl-3">
      {/* Ghost card 2 — bottom of stack */}
      <div className="absolute -top-2 left-3 w-[calc(100%-12px)] h-[calc(100%-12px)] rounded-xl border border-slate-200 bg-white rotate-[2deg] origin-bottom-left" />
      {/* Ghost card 1 */}
      <div className="absolute top-1 left-1 w-[calc(100%-12px)] h-[calc(100%-12px)] rounded-xl border border-slate-200 bg-white -rotate-[0.5deg] origin-bottom-left" />
      {/* Main card */}
      <motion.div className="relative z-10">
        <Card className="flex flex-col shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="truncate">{name}</CardTitle>
              {description && (
                <CardDescription className="truncate">
                  {description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 h-8 w-8 shrink-0 focus-visible:outline-none">
                <MoreVertical className="h-4 w-4 text-slate-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={onRename}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename Deck
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Deck
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col gap-3 mt-2">
              <div
                className={cn(
                  "text-sm font-medium w-fit transition-colors duration-300 rounded px-2 py-0.5 -ml-2",
                  isRecentlyUpdated
                    ? "bg-green-100 text-green-800"
                    : "text-slate-500 bg-transparent",
                )}
              >
                {totalCards} {totalCards === 1 ? "card" : "cards"}
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  {newCount} New
                </div>
                <div className="flex items-center gap-1.5 text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  {learningCount} Learn
                </div>
                <div className="flex items-center gap-1.5 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-600"></span>
                  {dueCount} Due
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Link href={studyHref} className="w-full">
              <Button variant="default" className="w-full">
                Study
              </Button>
            </Link>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={onAddCard}>
                Add Card
              </Button>
              <Link href={manageHref} className="flex-1">
                <Button variant="outline" className="w-full">
                  Manage
                </Button>
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
