import * as React from "react";

import { cn } from "@/lib/utils";

function EmptyList({
  className,
  ...props
}: React.ComponentProps<"div"> & { hasBorder?: boolean }) {
  return (
    <div
      data-slot="empty-list"
      className={cn(
        "w-full text-center flex flex-col items-center gap-5 rounded-xl py-10",
        className,
      )}
      {...props}
    />
  );
}

function EmptyListHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-list-header"
      className={cn("w-full flex flex-col items-center gap-4", className)}
      {...props}
    />
  );
}

function EmptyListIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-list-icon"
      className={cn(
        "size-16 flex flex-col items-center justify-center rounded-full bg-border text-foreground [&_svg]:size-8",
        className,
      )}
      {...props}
    />
  );
}

function EmptyListContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-list-content"
      className={cn("w-full max-w-lg flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function EmptyListTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="empty-list-title"
      className={cn(
        "max-w-full min-w-0 text-2xl font-bold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function EmptyListDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-list-description"
      className={cn(
        "max-w-full min-w-0 text-muted-foreground mx-auto",
        className,
      )}
      {...props}
    />
  );
}

function EmptyListFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-list-footer"
      className={cn(
        "w-full flex flex-wrap items-center justify-center gap-2",
        className,
      )}
      {...props}
    />
  );
}

export {
  EmptyList,
  EmptyListHeader,
  EmptyListIcon,
  EmptyListContent,
  EmptyListTitle,
  EmptyListDescription,
  EmptyListFooter,
};
