import ErrorCard from "@/components/error-card";
import { FormFieldWrapper, FormWrapper } from "@/components/form";
import { usePersistentForm } from "@/components/form-draft-provider";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SuggestButton } from "@/components/suggest-button";
import { useCardSuggestion } from "@/components/suggestion-provider";
import { FormInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormTextarea } from "@/components/ui/textarea";
import { useCardsByDeck, useCreateCard } from "@/hooks/data/use-cards";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { z } from "zod";

const normalizeFront = (front: string) => front.trim().toLowerCase();

const cardSchema = z.object({
  front: z.string().trim().min(1, "Front is required"),
  back: z.string().trim().min(1, "Back is required"),
});

export function AddCardForm({
  deckId,
  deckName,
  onDone,
}: {
  deckId: string;
  deckName: string;
  onDone: () => void;
}) {
  const mutation = useCreateCard();
  const {
    isPendingCard,
    isPendingBack,
    isPendingAny,
    error,
    result,
    suggestCard,
    suggestBack,
    takeResult,
    clear: clearSuggestion,
  } = useCardSuggestion(`add-card::${deckId}`);
  const { data: cards } = useCardsByDeck(deckId);
  const [existingFronts] = useState(
    () => new Set(cards.map((c) => normalizeFront(c.front))),
  );
  const form = usePersistentForm({
    id: "add-card",
    instanceId: deckId,
    defaultValues: { front: "", back: "" },
    validators: {
      onMount: cardSchema,
      onChange: cardSchema,
      onSubmit: cardSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync({
        deckId,
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
    if (suggestion.front !== undefined) {
      form.setFieldValue("front", suggestion.front);
    }
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
        <DialogTitle>Add Card</DialogTitle>
        <DialogDescription>
          The card will be added to "
          <span className="font-medium text-foreground">{deckName}</span>".
        </DialogDescription>
      </DialogHeader>
      <FormWrapper className="min-w-0">
        <form.Field name="front">
          {(field) => (
            <FormFieldWrapper>
              <div className="w-full flex items-center justify-between gap-4 min-w-0">
                <Label htmlFor={field.name} className="shrink min-w-0 truncate">
                  Front (Question)
                </Label>
                {cards.length > 0 && (
                  <SuggestButton
                    isPending={isPendingCard}
                    disabled={isPendingAny}
                    onClick={() => void suggestCard(deckId)}
                  />
                )}
              </div>
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
                {cards.length > 0 && (
                  <form.Subscribe selector={(s) => s.values.front}>
                    {(front) => (
                      <SuggestButton
                        isPending={isPendingBack}
                        disabled={front.trim() === "" || isPendingAny}
                        onClick={() => {
                          const trimmed = front.trim();
                          if (trimmed === "") return;
                          void suggestBack(deckId, trimmed);
                        }}
                      />
                    )}
                  </form.Subscribe>
                )}
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
      <form.Subscribe
        selector={(s) => ({
          canSubmit: s.canSubmit,
          isSubmitting: s.isSubmitting,
          front: s.values.front,
        })}
      >
        {({ canSubmit, isSubmitting, front }) => {
          const trimmed = front.trim();
          const isDuplicate =
            trimmed !== "" && existingFronts.has(normalizeFront(front));
          return (
            <>
              {error && (
                <div className="w-[calc(100%+0.5rem)] -mx-1 pb-4">
                  <ErrorCard error={error} />
                </div>
              )}
              {isDuplicate && (
                <div className="w-[calc(100%+0.5rem)] -mx-1 pb-4">
                  <DuplicateNotice />
                </div>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  isPending={isSubmitting}
                  variant={isDuplicate ? "warning" : "default"}
                >
                  {isDuplicate ? "Add Duplicate" : "Add Card"}
                </Button>
              </DialogFooter>
            </>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

function DuplicateNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full flex flex-col gap-2 rounded-md border bg-warning/10 border-warning/20 px-2.5 py-1.5",
        className,
      )}
    >
      <p className="w-full text-sm text-warning">
        This card is already in the deck.
      </p>
    </div>
  );
}
