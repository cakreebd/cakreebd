"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ProfileAvatar from "@/components/profile-avatar";

export default function ProfilePictureEditor({
  name,
  initialPictureUrl,
}: {
  name: string;
  initialPictureUrl: string | null;
}) {
  const router = useRouter();
  const [pictureUrl, setPictureUrl] = useState(initialPictureUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function uploadPicture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile/picture", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as { error?: string; profilePictureUrl?: string };
      if (!response.ok || !result.profilePictureUrl) {
        setError(result.error ?? "Your profile picture could not be uploaded.");
        return;
      }
      setPictureUrl(result.profilePictureUrl);
      setMessage("Profile picture updated.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removePicture() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile/picture", { method: "DELETE" });
      const result = (await response.json()) as { error?: string; profilePictureUrl?: string | null };
      if (!response.ok) {
        setError(result.error ?? "Your profile picture could not be removed.");
        return;
      }
      setPictureUrl(null);
      setMessage("Profile picture removed.");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Profile picture" className="profile-picture-editor">
      <ProfileAvatar className="profile-avatar-editor" name={name} pictureUrl={pictureUrl} />
      <div className="profile-picture-controls">
        <p>Use a JPEG, PNG, or WebP image up to 3 MB.</p>
        <form className="profile-picture-upload" onSubmit={uploadPicture}>
          <label className="upload-field">Choose picture
            <input accept="image/jpeg,image/png,image/webp" name="picture" required type="file" />
          </label>
          <button className="button button-outline" disabled={busy} type="submit">
            {busy ? "Uploading..." : pictureUrl ? "Replace picture" : "Upload picture"}
          </button>
        </form>
        {pictureUrl && <button className="subtle-button" disabled={busy} onClick={removePicture} type="button">Remove picture</button>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
      </div>
    </section>
  );
}
