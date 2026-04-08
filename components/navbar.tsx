"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { BrainCircuit, LogOut, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  backHref?: string;
  title?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function Navbar({ backHref, title, rightActions }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b h-16 flex items-center sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/" className="flex items-center shrink-0">
            <BrainCircuit className="h-6 w-6 text-blue-600" />
          </Link>

          {(backHref || title) && (
            <div className="flex items-center gap-2 border-l pl-4 min-w-0 flex-1">
              {backHref && (
                <Link href={backHref} className="shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {title && (
                <h1 className="text-lg font-semibold truncate min-w-0">
                  {title}
                </h1>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {rightActions}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  />
                }
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url || ""}
                    alt={user.email || ""}
                  />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="font-normal pointer-events-none">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
