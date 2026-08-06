"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

export type PhotoLocation = "portfolio" | "hero";

function sanitizeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
}

export async function uploadSitePhoto(formData: FormData) {
  const { supabase } = await requireAdmin();

  const location = formData.get("location") as PhotoLocation;
  const caption = ((formData.get("caption") as string) || "").trim();
  const tag = ((formData.get("tag") as string) || "").trim() || null;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    redirect(`/admin/photos?error=${encodeURIComponent("Choose a photo to upload.")}`);
  }
  if (!caption) {
    redirect(`/admin/photos?error=${encodeURIComponent("Add a caption before uploading.")}`);
  }

  const storagePath = `${location}/${randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("site-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    redirect(`/admin/photos?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { count } = await supabase
    .from("site_photos")
    .select("id", { count: "exact", head: true })
    .eq("location", location);

  await supabase.from("site_photos").insert({
    location,
    storage_path: storagePath,
    caption,
    tag,
    sort_order: count ?? 0,
  });

  revalidatePath("/admin/photos");
  revalidatePath("/portfolio");
  revalidatePath("/");
}

export async function updateSitePhoto(photoId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const caption = ((formData.get("caption") as string) || "").trim();
  const tag = ((formData.get("tag") as string) || "").trim() || null;
  const file = formData.get("file") as File | null;

  const update: { caption: string; tag: string | null; storage_path?: string } = {
    caption,
    tag,
  };

  if (file && file.size > 0) {
    const { data: existing } = await supabase
      .from("site_photos")
      .select("storage_path, location")
      .eq("id", photoId)
      .single();

    if (existing) {
      const newPath = `${existing.location}/${randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("site-photos")
        .upload(newPath, file, { contentType: file.type });

      if (!uploadError) {
        update.storage_path = newPath;
        await supabase.storage.from("site-photos").remove([existing.storage_path]);
      }
    }
  }

  await supabase.from("site_photos").update(update).eq("id", photoId);

  revalidatePath("/admin/photos");
  revalidatePath("/portfolio");
  revalidatePath("/");
}

export async function deleteSitePhoto(photoId: string) {
  const { supabase } = await requireAdmin();

  const { data: photo } = await supabase
    .from("site_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  await supabase.from("site_photos").delete().eq("id", photoId);
  if (photo) {
    await supabase.storage.from("site-photos").remove([photo.storage_path]);
  }

  revalidatePath("/admin/photos");
  revalidatePath("/portfolio");
  revalidatePath("/");
}

export async function moveSitePhoto(
  photoId: string,
  location: PhotoLocation,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();

  const { data: photos } = await supabase
    .from("site_photos")
    .select("id, sort_order")
    .eq("location", location)
    .order("sort_order", { ascending: true });

  if (!photos) return;

  const index = photos.findIndex((p) => p.id === photoId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= photos.length) return;

  const current = photos[index];
  const swap = photos[swapIndex];

  await Promise.all([
    supabase
      .from("site_photos")
      .update({ sort_order: swap.sort_order })
      .eq("id", current.id),
    supabase
      .from("site_photos")
      .update({ sort_order: current.sort_order })
      .eq("id", swap.id),
  ]);

  revalidatePath("/admin/photos");
  revalidatePath("/portfolio");
  revalidatePath("/");
}
