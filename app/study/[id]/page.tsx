"use client";

import { useAuth } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firebase-error";
import { calculateSM2 } from "@/lib/sm2";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { addDays } from "date-fns";
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { BrainCircuit, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewDate: any;
}

export default function StudyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data: deckName = "Loading...", isLoading: isDeckLoading } = useQuery({
    queryKey: ["deck", id],
    queryFn: async () => {
      if (!user || !id) return "Loading...";
      try {
        const docRef = doc(db, "decks", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data().name;
        } else {
          router.push("/");
          return "Deck not found";
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `decks/${id}`);
        return "Error loading deck";
      }
    },
    enabled: !!user && !!id,
  });

  const { data: studyData, isLoading: isCardsLoading } = useQuery({
    queryKey: ["studyCards", id, user?.uid],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      if (!user || !id) return { totalCards: 0, dueCards: [] };
      try {
        const totalQ = query(
          collection(db, "cards"),
          where("deckId", "==", id),
          where("userId", "==", user.uid),
        );
        const totalSnap = await getCountFromServer(totalQ);
        const totalCards = totalSnap.data().count;

        const now = Timestamp.now();
        const q = query(
          collection(db, "cards"),
          where("deckId", "==", id),
          where("userId", "==", user.uid),
          where("nextReviewDate", "<=", now),
        );

        const snapshot = await getDocs(q);
        const cardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Flashcard[];

        const shuffled = [...cardsData].sort(() => Math.random() - 0.5);
        return { totalCards, dueCards: shuffled };
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `cards`);
        return { totalCards: 0, dueCards: [] };
      }
    },
    enabled: !!user && !!id,
  });

  const isFetching = isDeckLoading || isCardsLoading;
  const totalCards = studyData?.totalCards || 0;
  const dueCards = studyData?.dueCards || [];

  const rateCardMutation = useMutation({
    mutationFn: async ({
      quality,
      currentCard,
    }: {
      quality: number;
      currentCard: Flashcard;
    }) => {
      const { interval, repetition, easeFactor } = calculateSM2(
        quality,
        currentCard.repetition,
        currentCard.interval,
        currentCard.easeFactor,
      );

      const nextDate = addDays(new Date(), interval);

      await updateDoc(doc(db, "cards", currentCard.id), {
        interval,
        repetition,
        easeFactor,
        nextReviewDate: Timestamp.fromDate(nextDate),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      setShowAnswer(false);
      setCurrentIndex((prev) => prev + 1);
    },
    onError: (error, variables) => {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `cards/${variables.currentCard.id}`,
      );
    },
  });

  const handleRate = (quality: number) => {
    if (!user) return;
    const currentCard = dueCards[currentIndex];
    rateCardMutation.mutate({ quality, currentCard });
  };

  const isFinished = currentIndex >= dueCards.length;
  const currentCard = dueCards[currentIndex];

  useEffect(() => {
    if (isFinished && dueCards.length > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isFinished, dueCards.length]);

  if (loading || (user && isFetching)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar
          backHref="/"
          title="Loading..."
          rightActions={
            <div className="text-sm font-medium text-transparent bg-slate-200 animate-pulse rounded w-12">
              &nbsp;
            </div>
          }
        />

        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
          <div className="w-full space-y-8">
            <Card className="min-h-[300px] flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-2xl font-medium text-transparent bg-slate-200 animate-pulse rounded mb-8 w-3/4 h-8"></div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                size="lg"
                className="w-full max-w-sm text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200"
              >
                &nbsp;
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        backHref="/"
        title={deckName}
        rightActions={
          !isFinished &&
          dueCards.length > 0 && (
            <div className="text-sm font-medium text-slate-500">
              {currentIndex + 1} / {dueCards.length}
            </div>
          )
        }
      />

      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full">
        {totalCards === 0 ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4">
              <BrainCircuit className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              This deck is empty
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto">
              You need to add some flashcards to this deck before you can study
              it.
            </p>
            <div className="pt-6 flex gap-4 justify-center">
              <Link href={`/deck/${id}`}>
                <Button>Add Cards</Button>
              </Link>
            </div>
          </div>
        ) : isFinished ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900">
              You&apos;re all caught up!
            </h2>
            <p className="text-lg text-slate-600 max-w-md mx-auto">
              You have reviewed all the due cards in this deck. Great job!
            </p>
            <div className="pt-6 flex gap-4 justify-center">
              <Link href="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href={`/deck/${id}`}>
                <Button>Manage Deck</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8">
            <Card className="min-h-[300px] flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center min-w-0">
                <div className="text-2xl font-medium text-slate-900 mb-8 break-words w-full">
                  {currentCard.front}
                </div>

                {showAnswer && (
                  <div className="w-full pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
                    <div className="text-xl text-slate-700 break-words w-full">
                      {currentCard.back}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center">
              {!showAnswer ? (
                <Button
                  size="lg"
                  className="w-full max-w-sm"
                  onClick={() => setShowAnswer(true)}
                >
                  Show Answer
                </Button>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRate(1)}
                    isLoading={
                      rateCardMutation.isPending &&
                      rateCardMutation.variables?.quality === 1
                    }
                    disabled={rateCardMutation.isPending}
                  >
                    <span className="font-bold">Again</span>
                    <span className="text-xs opacity-70">&lt; 1m</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => handleRate(3)}
                    isLoading={
                      rateCardMutation.isPending &&
                      rateCardMutation.variables?.quality === 3
                    }
                    disabled={rateCardMutation.isPending}
                  >
                    <span className="font-bold">Hard</span>
                    <span className="text-xs opacity-70">
                      {currentCard.interval === 0
                        ? "1d"
                        : `${Math.round(currentCard.interval * 1.2)}d`}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => handleRate(4)}
                    isLoading={
                      rateCardMutation.isPending &&
                      rateCardMutation.variables?.quality === 4
                    }
                    disabled={rateCardMutation.isPending}
                  >
                    <span className="font-bold">Good</span>
                    <span className="text-xs opacity-70">
                      {currentCard.interval === 0
                        ? "1d"
                        : `${Math.round(currentCard.interval * 2.5)}d`}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1 border-green-200 hover:bg-green-50 hover:text-green-700"
                    onClick={() => handleRate(5)}
                    isLoading={
                      rateCardMutation.isPending &&
                      rateCardMutation.variables?.quality === 5
                    }
                    disabled={rateCardMutation.isPending}
                  >
                    <span className="font-bold">Easy</span>
                    <span className="text-xs opacity-70">
                      {currentCard.interval === 0
                        ? "4d"
                        : `${Math.round(currentCard.interval * 2.5 * 1.3)}d`}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
