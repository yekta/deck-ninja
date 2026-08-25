import BgPattern from "@/components/bg-pattern";
import ErrorCard from "@/components/error-card";
import { FormFieldWrapper, FormWrapper } from "@/components/form";
import NewIndicator from "@/components/new-indicator";
import { useNow } from "@/components/now-provider";
import OptimisticIndicator from "@/components/optimistic-indicator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemText,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormTextarea } from "@/components/ui/textarea";
import { SuggestButton } from "@/components/suggest-button";
import { useCardSuggestion } from "@/components/suggestion-provider";
import { useDeleteCard, useUpdateCard } from "@/hooks/data/use-cards";
import { useForm } from "@tanstack/react-form";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

const cardSchema = z.object({
  front: z.string().trim().min(1, "Front is required"),
  back: z.string().trim().min(1, "Back is required"),
});

type TLCardManageProps =
  | { isPlaceholder: true }
  | {
      isPlaceholder?: never;
      id: string;
      deckId: string;
      front: string;
      back: string;
      createdAt: string | number | Date;
      updatedAt: string | number | Date;
      isOptimistic: boolean;
    };

export function LCardManage(props: TLCardManageProps) {
  const { isPlaceholder } = props;

  const front = isPlaceholder ? "This is the front of the card" : props.front;
  const back = isPlaceholder ? "This is the back of the card" : props.back;

  const now = useNow();
  const isNew =
    !isPlaceholder && now - new Date(props.createdAt).getTime() < 4000;
  const updatedAt = isPlaceholder ? null : new Date(props.updatedAt).getTime();
  const isRecentlyUpdated = updatedAt !== null && now - updatedAt < 4000;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOptimistic = isPlaceholder ? false : props.isOptimistic;

  return (
    <div
      className="group relative rounded-xl border flex flex-col border-border bg-background shadow-md shadow-shadow/shadow overflow-hidden isolate transition-colors"
      data-placeholder={isPlaceholder || undefined}
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Menu */}
      <div className="absolute top-1 right-1 z-10">
        {isPlaceholder && (
          <Button variant="ghost" isPlaceholder={true} className="size-9">
            <MoreVertical className="size-5 text-muted-foreground shrink-0" />
          </Button>
        )}
        {!isPlaceholder && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="size-9">
                  <MoreVertical className="size-5 shrink-0 text-muted-foreground group-data-popup-open/button:rotate-90 transition" />
                </Button>
              }
            ></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                <DropdownMenuItemText>Edit Card</DropdownMenuItemText>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <DropdownMenuItemText>Delete Card</DropdownMenuItemText>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isPlaceholder && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <EditCardForm
                id={props.id}
                deckId={props.deckId}
                front={props.front}
                back={props.back}
                onDone={() => setEditOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}

        {!isPlaceholder && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DeleteCardForm
                id={props.id}
                deckId={props.deckId}
                onDone={() => setDeleteOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      {/* Front */}
      <div className="px-5 py-4 w-full flex flex-col items-start relative bg-card gap-2">
        <NewIndicator
          isNew={isNew || isRecentlyUpdated}
          className="h-full rounded-tl-[calc(var(--radius)*1.4-1px)]"
          classNameInner="rounded-tl-[calc(var(--radius)*1.4-2px)]"
          classNameBg="h-4/5"
        />
        <p className="shrink max-w-full flex items-center relative pr-6 min-w-0 overflow-hidden text-ellipsis text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-placeholder:text-transparent group-data-placeholder:bg-muted-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          <span className="mr-[0.5ch] shrink min-w-0 truncate">Front</span>
          {!isPlaceholder && (
            <OptimisticIndicator
              isOptimistic={isOptimistic}
              className="size-3"
            />
          )}
        </p>
        <p className="shrink relative max-w-full min-w-0 text-sm text-foreground line-clamp-3 wrap-break-word font-medium leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {front}
        </p>
      </div>

      {/* Divider: ruled line style */}
      <div className="w-full h-px bg-border relative z-10" />

      {/* Back */}
      <div className="px-5 flex-1 py-4 relative w-full flex flex-col items-start gap-2">
        <BgPattern />
        <p className="relative shrink max-w-full pr-5 min-w-0 overflow-hidden text-ellipsis text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-placeholder:text-transparent group-data-placeholder:bg-muted-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:w-10 group-data-placeholder:select-none">
          Back
        </p>
        <p className="relative shrink max-w-full min-w-0 text-sm text-foreground line-clamp-3 wrap-break-word leading-relaxed group-data-placeholder:text-transparent group-data-placeholder:bg-foreground/20 group-data-placeholder:animate-pulse group-data-placeholder:rounded group-data-placeholder:select-none">
          {back}
        </p>
      </div>
    </div>
  );
}

function EditCardForm({
  id,
  deckId,
  front,
  back,
  onDone,
}: {
  id: string;
  deckId: string;
  front: string;
  back: string;
  onDone: () => void;
}) {
  const mutation = useUpdateCard();
  const {
    isPendingBack,
    error,
    result,
    suggestBack,
    takeResult,
    clear: clearSuggestion,
  } = useCardSuggestion(`edit-card::${id}`);
  const form = useForm({
    defaultValues: { front, back },
    validators: {
      onMount: cardSchema,
      onChange: cardSchema,
      onSubmit: cardSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        id,
        front: value.front,
        back: value.back,
      });
      clearSuggestion();
      onDone();
    },
  });

  useEffect(() => {
    if (!result) return;
    const suggestion = takeResult();
    if (!suggestion) return;
    form.setFieldValue("back", suggestion.back);
  }, [result, takeResult, form]);

  return (
    <form
      className="min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Edit Card</DialogTitle>
      </DialogHeader>
      <FormWrapper className="min-w-0">
        <form.Field name="front">
          {(field) => (
            <FormFieldWrapper>
              <Label htmlFor={field.name}>Front (Question)</Label>
              <FormInput
                id={field.name}
                name={field.name}
                autoCapitalize="none"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </FormFieldWrapper>
          )}
        </form.Field>
        <form.Field name="back">
          {(field) => (
            <FormFieldWrapper className="min-w-0">
              <div className="w-full flex items-center justify-between gap-4 min-w-0">
                <Label className="shrink min-w-0 truncate" htmlFor={field.name}>
                  Back (Answer)
                </Label>
                <form.Subscribe selector={(s) => s.values.front}>
                  {(front) => (
                    <SuggestButton
                      isPending={isPendingBack}
                      disabled={front.trim() === "" || isPendingBack}
                      onClick={() => {
                        const trimmed = front.trim();
                        if (trimmed === "") return;
                        void suggestBack(deckId, trimmed);
                      }}
                    />
                  )}
                </form.Subscribe>
              </div>
              <FormTextarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={4}
                className="resize-none"
              />
            </FormFieldWrapper>
          )}
        </form.Field>
      </FormWrapper>
      {error && (
        <div className="w-[calc(100%+0.5rem)] -mx-1 pb-4">
          <ErrorCard error={error} />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(s) => ({
            canSubmit: s.canSubmit,
            isSubmitting: s.isSubmitting,
            isDirty: s.isDirty,
          })}
        >
          {({ canSubmit, isSubmitting, isDirty }) => (
            <Button
              type="submit"
              disabled={!canSubmit || !isDirty}
              isPending={isSubmitting}
            >
              Save
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
}

function DeleteCardForm({
  id,
  deckId,
  onDone,
}: {
  id: string;
  deckId: string;
  onDone: () => void;
}) {
  const mutation = useDeleteCard();
  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete Card</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this card? This action cannot be
          undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            // Optimistic: the card disappears immediately; the server catches
            // up in the background.
            void mutation.mutateAsync({ id });
            onDone();
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </>
  );
}
