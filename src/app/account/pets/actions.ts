"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { monthsSince } from "@/lib/pricing/pricing";

function readPetFields(formData: FormData) {
  const birthDate = (formData.get("birthDate") as string) || null;

  return {
    name: formData.get("name") as string,
    species: formData.get("species") as string,
    breed: formData.get("breed") as string,
    coat: formData.get("coat") as string,
    weight_lb: Number(formData.get("weightLb")),
    color: (formData.get("color") as string) || null,
    health_concerns: (formData.get("healthConcerns") as string) || null,
    birth_date: birthDate,
    // Server-derived, never trust a client-submitted puppy flag directly.
    is_puppy: birthDate !== null && monthsSince(birthDate) < 6,
  };
}

export async function createPet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Defensive: guarantee a profile row exists so the pet's owner_id
  // foreign key can't fail if the signup trigger didn't create one.
  await supabase.from("profiles").upsert({ id: user.id });

  const { error } = await supabase.from("pets").insert({
    owner_id: user.id,
    ...readPetFields(formData),
  });

  if (error) {
    redirect(`/account/pets/new?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}

export async function updatePet(formData: FormData) {
  const supabase = await createClient();
  const petId = formData.get("petId") as string;

  const { error } = await supabase
    .from("pets")
    .update(readPetFields(formData))
    .eq("id", petId);

  if (error) {
    redirect(
      `/account/pets/${petId}?error=${encodeURIComponent(error.message)}`,
    );
  }
  redirect("/account");
}

export async function uploadRabiesVaccine(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const petId = formData.get("petId") as string;
  const file = formData.get("file") as File;
  const expiresAt = formData.get("expiresAt") as string;

  if (!file || file.size === 0) {
    redirect(`/account/pets/${petId}?error=Choose+a+PDF+to+upload`);
  }
  if (!expiresAt) {
    redirect(
      `/account/pets/${petId}?error=Enter+the+vaccine%27s+expiration+date`,
    );
  }

  const path = `${user.id}/${petId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("vaccine-records")
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (uploadError) {
    redirect(
      `/account/pets/${petId}?error=${encodeURIComponent(uploadError.message)}`,
    );
  }

  await supabase
    .from("pets")
    .update({
      rabies_vaccine_path: path,
      rabies_uploaded_at: new Date().toISOString(),
      rabies_expires_at: expiresAt,
    })
    .eq("id", petId);

  redirect(`/account/pets/${petId}?saved=1`);
}
