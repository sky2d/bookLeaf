"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { myBooksQuery } from "@/app/author/books/MyBooks";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { ApiError, api } from "@/lib/apiClient";
import type { CreateTicketResponse } from "@/shared/dto";
import { createTicketSchema, sanitizeAttachmentName } from "@/shared/schemas/ticket";

export function NewTicketForm({ preselectedBookId }: { preselectedBookId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: booksData, error: booksError, isPending: booksLoading, refetch } = useQuery(myBooksQuery);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (booksLoading) {
    return <LoadingBlock label="Loading book details…" lines={3} />;
  }

  if (booksError) {
    return (
      <ErrorBlock
        message="We could not load your books list to associate with this ticket."
        onRetry={() => refetch()}
      />
    );
  }

  const books = booksData?.books ?? [];
  const isPreselectedOwned = Boolean(preselectedBookId && books.some((b) => b.id === preselectedBookId));
  const activeBookId = selectedBookId ?? (isPreselectedOwned ? preselectedBookId! : "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sanitized = sanitizeAttachmentName(file.name);
      setAttachmentName(sanitized);
    } else {
      setAttachmentName(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = {
      bookId: activeBookId || null,
      subject,
      description,
      attachmentName,
    };

    const validation = createTicketSchema.safeParse(payload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0]?.toString() ?? "general";
        errors[path] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api<CreateTicketResponse>("/api/tickets", {
        method: "POST",
        json: validation.data,
      });

      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      router.push(`/author/tickets/${res.ticket.id}`);
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        const serverFieldErrors = err.fieldErrors();
        if (Object.keys(serverFieldErrors).length > 0) {
          setFieldErrors(serverFieldErrors);
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Failed to submit ticket. Please try again.");
      }
    }
  };

  const descTrimmedLength = description.trim().length;
  const descCharsLeft = 5000 - description.length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError && (
        <div role="alert" className="rounded-md bg-proof-soft px-4 py-3 text-sm text-proof">
          {formError}
        </div>
      )}

      <Field
        id="bookId"
        label="Regarding book"
        hint="Select the book your inquiry is about, or choose General for account-level inquiries."
        error={fieldErrors.bookId}
      >
        <Select
          id="bookId"
          value={activeBookId}
          onChange={(e) => setSelectedBookId(e.target.value)}
          aria-invalid={Boolean(fieldErrors.bookId)}
        >
          <option value="">General / Account Level</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} ({b.published ? "Published" : b.stage})
            </option>
          ))}
        </Select>
      </Field>

      <Field
        id="subject"
        label="Subject"
        hint="Summarise your query in 5 to 150 characters."
        error={fieldErrors.subject}
      >
        <Input
          id="subject"
          name="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Discrepancy in quarterly royalty calculation"
          maxLength={150}
          aria-invalid={Boolean(fieldErrors.subject)}
          required
        />
      </Field>

      <Field
        id="description"
        label="Description"
        hint={
          <span className="flex justify-between text-xs text-ink-faint">
            <span>
              {descTrimmedLength < 20
                ? `${20 - descTrimmedLength} more characters required`
                : "Minimum requirement met"}
            </span>
            <span>{descCharsLeft >= 0 ? `${description.length} / 5,000` : "Character limit exceeded"}</span>
          </span>
        }
        error={fieldErrors.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe your query in detail. Include any dates, reference numbers, or context that will help us investigate..."
          aria-invalid={Boolean(fieldErrors.description)}
          required
        />
      </Field>

      <Field
        id="attachment"
        label="Attachment (optional)"
        hint="Only the file name is sent for now. Our team will ask for the file if they need it."
        error={fieldErrors.attachmentName}
      >
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            id="attachment"
            type="file"
            onChange={handleFileChange}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-surface-tint file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-rule"
          />
          {attachmentName && (
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <span className="font-mono">{attachmentName}</span>
              <button
                type="button"
                onClick={clearAttachment}
                className="text-proof underline hover:text-proof/80"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </Field>

      <div className="mt-2 flex items-center justify-end gap-3 pt-4 border-t border-rule">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Submit query"}
        </Button>
      </div>
    </form>
  );
}
