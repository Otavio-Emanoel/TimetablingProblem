"use server";

import { revalidatePath } from "next/cache";

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

export async function createProfessor(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    maxWeeklyHours: Number(formData.get("maxWeeklyHours") ?? 0),
    unavailability: String(formData.get("unavailability") ?? "").trim(),
  };

  if (!payload.name || !payload.email || payload.maxWeeklyHours <= 0) {
    return;
  }

  await fetch(`${apiBase}/api/professors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function createClassGroup(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.name) {
    return;
  }

  await fetch(`${apiBase}/api/class-groups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function createSubject(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    classGroupId: Number(formData.get("classGroupId") ?? 0),
  };

  if (!payload.name || !payload.classGroupId) {
    return;
  }

  await fetch(`${apiBase}/api/subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function createDemand(formData: FormData) {
  const professorIds = formData.getAll("professorIds").map((value) => Number(value));
  const payload = {
    subjectId: Number(formData.get("subjectId") ?? 0),
    professorIds,
    quantityPerWeek: Number(formData.get("quantityPerWeek") ?? 0),
    allowDoubleLesson: String(formData.get("allowDoubleLesson") ?? "").trim() === "on",
  };

  if (!payload.subjectId || payload.professorIds.length === 0 || payload.quantityPerWeek <= 0) {
    return;
  }

  await fetch(`${apiBase}/api/demands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function startSolver() {
  await fetch(`${apiBase}/api/solver/iniciar`, {
    method: "POST",
  });

  revalidatePath("/");
}

export async function createTimeslot(formData: FormData) {
  const payload = {
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.dayOfWeek || !payload.startTime || !payload.endTime) {
    return;
  }

  await fetch(`${apiBase}/api/timeslots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}
