"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { monthsSince } from "@/lib/pricing/pricing";

function readPetFields(formData: FormData) {
  const birthDate = (formData.get("birthDate") as string) || null;
  const species = formData.get("species") as string;

  return {
    name: formData.get("name") as string,
    species,
    breed: formData.get("breed") as string,
    coat: formData.get("coat") as string,
    weight_lb: Number(formData.get("weightLb")),
    color: (formData.get("color") as string) || null,
    health_concerns: (formData.get("healthConcerns") as string) || null,
    birth_date: birthDate,
    // Server-derived, never trust a client-submitted puppy flag directly.
    // Puppy pricing only exists for dogs — a cat's birth date shouldn't
    // ever flip this on.
    is_puppy: species === "dog" && birthDate !== null && monthsSince(birthDate) < 6,
  };
}

export async function createPet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fields = readPetFields(formData);
  if (!fields.birth_date) {
    redirect(
      `/account/pets/new?error=${encodeURIComponent("Please enter your pet's date of birth.")}`,
    );
  }

  // Defensive: guarantee a profile row exists so the pet's owner_id
  // foreign key can't fail if the signup trigger didn't create one.
  await supabase.from("profiles").upsert({ id: user.id });

  const { error } = await supabase.from("pets").insert({
    owner_id: user.id,
    ...fields,
  });

  if (error) {
    redirect(`/account/pets/new?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account");
}

// Lets an admin add a pet's first profile on a customer's behalf (e.g. a
// walk-in or phone booking where the customer hasn't set one up yet).
export async function adminCreatePet(customerId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const fields = readPetFields(formData);
  if (!fields.birth_date) {
    redirect(
      `/admin/pets/new?customerId=${customerId}&error=${encodeURIComponent(
        "Please enter the pet's date of birth.",
      )}`,
    );
  }

  // Defensive: guarantee a profile row exists so the pet's owner_id
  // foreign key can't fail if the signup trigger didn't create one.
  await supabase.from("profiles").upsert({ id: customerId });

  const { data: pet, error } = await supabase
    .from("pets")
    .insert({ owner_id: customerId, ...fields })
    .select("id")
    .single();

  if (error || !pet) {
    redirect(
      `/admin/pets/new?customerId=${customerId}&error=${encodeURIComponent(
        error?.message ?? "Could not add pet",
      )}`,
    );
  }

  redirect(`/admin/pets/${pet.id}`);
}

export async function updatePet(formData: FormData) {
  const supabase = await createClient();
  const petId = formData.get("petId") as string;

  const fields = readPetFields(formData);
  if (!fields.birth_date) {
    redirect(
      `/account/pets/${petId}?error=${encodeURIComponent("Please enter your pet's date of birth.")}`,
    );
  }

  const { error } = await supabase
    .from("pets")
    .update(fields)
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
