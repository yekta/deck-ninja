"use client";

import { useAuth } from "@/components/auth-provider";
import Logo from "@/components/icons/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AvailableThemesEnum,
  DEFAULT_NON_SYSTEM_THEME,
  TTheme,
} from "@/lib/constants";
import {
  ArrowLeftIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  MonitorSmartphoneIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";

const THEME_META: Record<TTheme, { label: string; icon: React.ElementType }> = {
  light: { label: "Light", icon: SunIcon },
  dark: { label: "Dark", icon: MoonIcon },
  system: { label: "System", icon: MonitorSmartphoneIcon },
};

function ThemeMenuItem() {
  const { theme, setTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? theme : undefined;

  const themeForLabel = AvailableThemesEnum.safeParse(current);
  const label = themeForLabel.success
    ? THEME_META[themeForLabel.data].label
    : THEME_META[DEFAULT_NON_SYSTEM_THEME].label;
  const Icon = themeForLabel.success
    ? THEME_META[themeForLabel.data].icon
    : THEME_META[DEFAULT_NON_SYSTEM_THEME].icon;

  const cycleTheme = () => {
    if (!current) return;
    const idx = themes.indexOf(current);
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
  };

  return (
    <DropdownMenuItem closeOnClick={false} onClick={cycleTheme}>
      <Icon className="size-5" />
      <span>Theme: {label}</span>
    </DropdownMenuItem>
  );
}

type TNavbarProps = {
  backHref?: string;
  title?: React.ReactNode;
  rightActions?: React.ReactNode;
};

export function Navbar({ backHref, title, rightActions }: TNavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-background border-b h-14 flex items-center sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-5 w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/" className="flex items-center shrink-0 group">
            <Logo className="group-active:rotate-5 group-active:translate-y-0.5 transition-transform" />
          </Link>

          {(backHref || title) && (
            <div className="flex items-center gap-2 border-l pl-4 min-w-0 flex-1">
              {backHref && (
                <Link href={backHref} className="shrink-0">
                  <Button variant="ghost" size="icon" className="size-9">
                    <ArrowLeftIcon className="size-5" />
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
                    className="relative size-8 p-0 rounded-full border-[2px] border-border hover:border-foreground/50 active:border-foreground/50"
                  />
                }
              >
                <Avatar className="size-7">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url || ""}
                    alt={user.email || ""}
                  />
                  <AvatarFallback>
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem className="font-normal pointer-events-none">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ThemeMenuItem />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOutIcon className="size-5" />
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
