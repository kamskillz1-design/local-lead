import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPublicForm, submitPublicForm } from "@/api/publicForms";

export default function PublicForm() {
  const { identifier } = useParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({ name: "", email: "", phone: "", message: "", website: "", consent: false });

  useEffect(() => {
    getPublicForm(identifier)
      .then(setForm)
      .catch((e) => setError(e.message || "Form not found"));
  }, [identifier]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await submitPublicForm(identifier, values);
      if (form.redirect_url) {
        window.location.assign(form.redirect_url);
        return;
      }
      setDone(result?.success_message || form.success_message || "Thank you — we received your enquiry and will get back to you shortly.");
    } catch (err) {
      setError(err.message || "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  if (error && !form) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-sm text-red-600">{error}</div>;
  }
  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="max-w-md text-center text-sm">{done}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white border rounded-2xl p-8 space-y-4">
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="message">How can we help?</Label>
          <textarea
            id="message"
            className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
          />
        </div>
        {form.spam_protection_enabled !== false && (
          <div className="hidden" aria-hidden="true">
            <input tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))} />
          </div>
        )}
        {form.consent_text && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={values.consent} onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))} />
            <span>
              {form.consent_text}
              {form.privacy_policy_url && (
                <>
                  {" "}
                  <a className="text-primary underline" href={form.privacy_policy_url} target="_blank" rel="noreferrer">
                    Privacy policy
                  </a>
                </>
              )}
            </span>
          </label>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
