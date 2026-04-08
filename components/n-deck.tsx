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

type NDeckProps =
  | { isPlaceholder: true }
  | {
      isPlaceholder?: never;
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
    };

export function NDeck(props: NDeckProps) {
  const { isPlaceholder } = props;

  const name = isPlaceholder ? "Deck Name" : props.name;
  const description = isPlaceholder ? "A short description" : props.description;
  const totalCards = isPlaceholder ? 0 : props.totalCards;
  const newCount = isPlaceholder ? 0 : props.newCount;
  const learningCount = isPlaceholder ? 0 : props.learningCount;
  const dueCount = isPlaceholder ? 0 : props.dueCount;
  const isRecentlyUpdated = isPlaceholder ? false : props.isRecentlyUpdated;

  return (
    <div
      className="group relative pt-3 pl-3"
      data-placeholder={isPlaceholder || undefined}
    >
      {/* Ghost card 2 — bottom of stack */}
      <div className="absolute -top-2 left-3 w-[calc(100%-12px)] h-[calc(100%-12px)] rounded-xl border border-border bg-card rotate-[2deg] origin-bottom-left shadow-md" />
      {/* Ghost card 1 */}
      <div className="absolute top-1 left-1 w-[calc(100%-12px)] h-[calc(100%-12px)] rounded-xl border border-border bg-card -rotate-[0.5deg] origin-bottom-left shadow-md" />
      {/* Main card */}
      <motion.div className="relative z-10">
        <Card className="flex flex-col shadow-md">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="truncate group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                {name}
              </CardTitle>
              {(isPlaceholder || description) && (
                <CardDescription className="truncate group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  {description ?? "\u00a0"}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 h-8 w-8 shrink-0 focus-visible:outline-none group-data-placeholder:pointer-events-none group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:text-transparent">
                <MoreVertical className="h-4 w-4 text-slate-500 group-data-placeholder:opacity-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={isPlaceholder ? undefined : props.onRename}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename Deck
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={isPlaceholder ? undefined : props.onDelete}
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
                <p className="group-data-placeholder:text-transparent group-data-placeholder:rounded group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:select-none">
                  {totalCards} {totalCards === 1 ? "card" : "cards"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5 text-blue-600 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-blue-600 group-data-placeholder:opacity-0" />
                  {newCount} New
                </div>
                <div className="flex items-center gap-1.5 text-red-600 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-red-600 group-data-placeholder:opacity-0" />
                  {learningCount} Learn
                </div>
                <div className="flex items-center gap-1.5 text-green-600 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-green-600 group-data-placeholder:opacity-0" />
                  {dueCount} Due
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {isPlaceholder ? (
              <Button
                variant="default"
                className="w-full text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
              >
                &nbsp;
              </Button>
            ) : (
              <Link href={props.studyHref} className="w-full">
                <Button variant="default" className="w-full">
                  Study
                </Button>
              </Link>
            )}
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1 group-data-placeholder:text-transparent group-data-placeholder:bg-slate-200 group-data-placeholder:animate-pulse group-data-placeholder:border-transparent group-data-placeholder:pointer-events-none group-data-placeholder:hover:bg-slate-200"
                onClick={isPlaceholder ? undefined : props.onAddCard}
              >
                {isPlaceholder ? "\u00a0" : "Add Card"}
              </Button>
              {isPlaceholder ? (
                <Button
                  variant="outline"
                  className="flex-1 text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
                >
                  &nbsp;
                </Button>
              ) : (
                <Link href={props.manageHref} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Manage
                  </Button>
                </Link>
              )}
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
