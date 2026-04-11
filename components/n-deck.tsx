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
import { MoreVertical, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import Dots from "@/components/dots";

type TNDeckProps =
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
      onEdit: () => void;
      onDelete: () => void;
    };

export function NDeck(props: TNDeckProps) {
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
      className="group relative"
      data-placeholder={isPlaceholder || undefined}
    >
      {/* Ghost card 2 — bottom of stack */}
      {(isPlaceholder || totalCards > 2) && (
        <div className="shadow-md absolute -top-2.5 -left-0.5 w-full h-full rounded-xl border border-border bg-card -rotate-[1deg] origin-bottom-left" />
      )}
      {/* Ghost card 1 */}
      {(isPlaceholder || totalCards > 1) && (
        <div className="shadow-md absolute -top-1 left-2.5 w-full h-full rounded-xl border border-border bg-card -rotate-[1deg] origin-bottom-left" />
      )}
      {/* Main card */}
      <motion.div className="relative z-10">
        <Card className="flex flex-col shadow-md relative">
          {!isPlaceholder && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex absolute right-1 top-1 items-center justify-center rounded-lg text-sm font-medium hover:bg-accent size-9 shrink-0 focus-visible:outline-none group-data-placeholder:pointer-events-none group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:text-transparent">
                <MoreVertical className="size-5 text-muted-foreground group-data-placeholder:opacity-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={isPlaceholder ? undefined : props.onEdit}
                >
                  <Settings className="size-5" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={isPlaceholder ? undefined : props.onDelete}
                >
                  <Trash2 className="size-5" />
                  Delete Deck
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
            <div className="space-y-1 min-w-0">
              <CardTitle className="truncate pr-5 group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                {name}
              </CardTitle>
              <CardDescription className="truncate group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                {description || <>&nbsp;</>}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex flex-col items-start gap-3 mt-2">
              <div
                data-updated={isRecentlyUpdated ? "true" : undefined}
                className="text-sm max-w-full text-muted-foreground bg-transparent flex justify-start transition-colors duration-300 rounded px-2 py-0.5 -ml-2 data-updated:bg-success-muted data-updated:text-success-foreground"
              >
                <p className="max-w-full min-w-0 group-data-placeholder:text-transparent group-data-placeholder:rounded group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:select-none">
                  {totalCards} {totalCards === 1 ? "card" : "cards"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-state-new group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-state-new group-data-placeholder:opacity-0" />
                  {newCount} New
                </div>
                <div className="flex items-center gap-1.5 text-state-learn group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-state-learn group-data-placeholder:opacity-0" />
                  {learningCount} Learn
                </div>
                <div className="flex items-center gap-1.5 text-state-due group-data-placeholder:text-transparent group-data-placeholder:bg-skeleton group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
                  <span className="w-2 h-2 rounded-full bg-state-due group-data-placeholder:opacity-0" />
                  {dueCount} Due
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col w-full gap-2 relative">
            <Dots />
            {isPlaceholder ? (
              <Button
                variant="default"
                className="w-full text-transparent bg-skeleton animate-pulse border-transparent pointer-events-none hover:bg-skeleton"
              >
                Study
              </Button>
            ) : (
              <Link href={props.studyHref} className="w-full">
                <Button variant="default" className="w-full">
                  Study
                </Button>
              </Link>
            )}
            {isPlaceholder ? (
              <Button
                variant="outline"
                className="w-full text-transparent bg-skeleton animate-pulse border-transparent pointer-events-none hover:bg-skeleton"
              >
                Manage
              </Button>
            ) : (
              <Link href={props.manageHref} className="w-full">
                <Button variant="outline" className="w-full">
                  Manage
                </Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
