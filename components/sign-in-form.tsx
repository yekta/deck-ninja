"use client";

import { useAuth } from "@/components/auth-provider";
import Logo from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";

type TProps = {
  className?: string;
};

export default function SignInForm({ className }: TProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push("/");
  }, [user]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center p-4",
        className,
      )}
    >
      {loading ? (
        <div className="w-full flex flex-col items-center justify-center">
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="max-w-md text-center space-y-6">
          <Logo className="mx-auto size-16" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            DeckNinja
          </h1>
          <p className="text-lg text-muted-foreground">
            Master any subject with spaced repetition. Sign in to start
            learning.
          </p>
          <Button
            onClick={handleSignIn}
            className="w-full max-w-64"
            isPending={isSigningIn}
          >
            Sign in with Google
          </Button>
        </div>
      )}
    </div>
  );
}
