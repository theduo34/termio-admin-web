import { useId, type FormEvent } from "react"
import { Mail, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type LoginFormProps = {
  pending: boolean
  error?: string | null
  onSubmit: (formData: FormData) => void
}

export function LoginForm({ pending, error, onSubmit }: LoginFormProps) {
  const emailId = useId()
  const passwordId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(new FormData(event.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field>
        <FieldLabel htmlFor={emailId}>Email address</FieldLabel>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={emailId}
            name="email"
            type="email"
            placeholder="you@institution.edu"
            autoComplete="email"
            required
            disabled={pending}
            className="h-11 rounded-md pl-10"
          />
        </div>
      </Field>

      <Field>
        <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={passwordId}
            name="password"
            type="password"
            placeholder="••••••••••"
            autoComplete="current-password"
            required
            disabled={pending}
            className="h-11 rounded-md pl-10"
          />
        </div>
      </Field>

      {error ? <FieldError className="-mt-1">{error}</FieldError> : null}

      <Button type="submit" disabled={pending} className="w-full rounded-md text-sm font-semibold">
        {pending ? "Signing in..." : "Continue"}
      </Button>
    </form>
  )
}
