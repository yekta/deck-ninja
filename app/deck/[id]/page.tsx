"use client";

import { useAuth } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firebase-error";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  nextReviewDate: any;
  repetition: number;
}

export default function DeckPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

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

  const { data: cards = [], isLoading: isCardsLoading } = useQuery({
    queryKey: ["cards", id, user?.uid],
    queryFn: async () => {
      if (!user || !id) return [];
      try {
        const q = query(
          collection(db, "cards"),
          where("deckId", "==", id),
          where("userId", "==", user.uid),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Flashcard[];
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "cards");
        return [];
      }
    },
    enabled: !!user && !!id,
  });

  const isFetching = isDeckLoading || isCardsLoading;

  const addCardMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newFront.trim() || !newBack.trim())
        throw new Error("Missing data");
      await addDoc(collection(db, "cards"), {
        deckId: id,
        userId: user.uid,
        front: newFront.trim(),
        back: newBack.trim(),
        interval: 0,
        repetition: 0,
        easeFactor: 2.5,
        nextReviewDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({
        queryKey: ["studyCards", id, user?.uid],
      });
      setNewFront("");
      setNewBack("");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      handleFirestoreError(error, OperationType.CREATE, "cards");
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async () => {
      if (!cardToDelete) throw new Error("No card to delete");
      await deleteDoc(doc(db, "cards", cardToDelete));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({
        queryKey: ["studyCards", id, user?.uid],
      });
      setCardToDelete(null);
    },
    onError: (error) => {
      if (cardToDelete) {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `cards/${cardToDelete}`,
        );
      }
    },
  });

  const editCardMutation = useMutation({
    mutationFn: async () => {
      if (!user || !cardToEdit || !editFront.trim() || !editBack.trim())
        throw new Error("Missing data");
      await updateDoc(doc(db, "cards", cardToEdit.id), {
        front: editFront.trim(),
        back: editBack.trim(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", id, user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({
        queryKey: ["studyCards", id, user?.uid],
      });
      setCardToEdit(null);
      setEditFront("");
      setEditBack("");
    },
    onError: (error) => {
      if (cardToEdit) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `cards/${cardToEdit.id}`,
        );
      }
    },
  });

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    addCardMutation.mutate();
  };

  const handleDeleteCard = () => {
    deleteCardMutation.mutate();
  };

  const handleEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    editCardMutation.mutate();
  };

  if (loading || (user && isFetching)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar
          backHref="/"
          title={<Skeleton className="h-6 w-48" />}
          rightActions={
            <Button className="text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200">
              &nbsp;
            </Button>
          }
        />

        <main className="max-w-5xl mx-auto p-6 space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-transparent bg-slate-200 animate-pulse rounded w-32 max-w-full shrink">
              &nbsp;
            </h2>
            <Button className="text-transparent bg-slate-200 animate-pulse border-transparent pointer-events-none hover:bg-slate-200 shrink-0">
              <Plus className="h-4 w-4 mr-2 opacity-0" />
              &nbsp;
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 gap-4">
                  <CardTitle className="text-base font-medium text-transparent bg-slate-200 animate-pulse rounded w-12 shrink-0">
                    &nbsp;
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-slate-200 animate-pulse pointer-events-none hover:bg-slate-200 shrink-0"
                  >
                    <MoreVertical className="h-4 w-4 opacity-0" />
                  </Button>
                </CardHeader>
                <CardContent className="min-w-0">
                  <p className="text-sm text-transparent bg-slate-200 animate-pulse rounded mb-4 w-full truncate">
                    &nbsp;
                  </p>
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-semibold uppercase mb-1 text-transparent bg-slate-200 animate-pulse rounded w-12">
                      &nbsp;
                    </h4>
                    <p className="text-sm text-transparent bg-slate-200 animate-pulse rounded w-full truncate">
                      &nbsp;
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        backHref="/"
        title={deckName}
        rightActions={
          <Link href={`/study/${id}`}>
            <Button>Study Deck</Button>
          </Link>
        }
      />

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight truncate min-w-0">
            Cards ({cards.length})
          </h2>

          <Dialog
            open={cardToDelete !== null}
            onOpenChange={(open) => !open && setCardToDelete(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Card</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this flashcard? This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCardToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCard}
                  isLoading={deleteCardMutation.isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={cardToEdit !== null}
            onOpenChange={(open) => !open && setCardToEdit(null)}
          >
            <DialogContent>
              <form onSubmit={handleEditCard}>
                <DialogHeader>
                  <DialogTitle>Edit flashcard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-front">Front (Question)</Label>
                    <Input
                      id="edit-front"
                      value={editFront}
                      onChange={(e) => setEditFront(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-back">Back (Answer)</Label>
                    <Input
                      id="edit-back"
                      value={editBack}
                      onChange={(e) => setEditBack(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCardToEdit(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!editFront.trim() || !editBack.trim()}
                    isLoading={editCardMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddCard}>
                <DialogHeader>
                  <DialogTitle>Add a new flashcard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="front">Front (Question)</Label>
                    <Input
                      id="front"
                      value={newFront}
                      onChange={(e) => setNewFront(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="back">Back (Answer)</Label>
                    <Input
                      id="back"
                      value={newBack}
                      onChange={(e) => setNewBack(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!newFront.trim() || !newBack.trim()}
                    isLoading={addCardMutation.isPending}
                  >
                    Add Card
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No cards yet
            </h3>
            <p className="text-slate-500 mb-6">
              Add your first flashcard to this deck.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Front</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 h-8 w-8 shrink-0 focus-visible:outline-none">
                      <MoreVertical className="h-4 w-4 text-slate-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setCardToEdit(card);
                          setEditFront(card.front);
                          setEditBack(card.back);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => setCardToDelete(card.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="min-w-0">
                  <p className="text-sm text-slate-900 mb-4 line-clamp-3 break-words">
                    {card.front}
                  </p>
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                      Back
                    </h4>
                    <p className="text-sm text-slate-900 line-clamp-3 break-words">
                      {card.back}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
