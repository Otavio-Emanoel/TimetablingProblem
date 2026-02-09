"use server";

import { revalidatePath } from "next/cache";

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

export async function createProfessor(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
  };

  if (!payload.name) {
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

export async function updateProfessor(formData: FormData) {
  const professorId = Number(formData.get("professorId") ?? 0);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
  };

  if (!professorId || !payload.name) {
    return;
  }

  await fetch(`${apiBase}/api/professors/${professorId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function deleteProfessor(formData: FormData) {
  const professorId = Number(formData.get("professorId") ?? 0);
  if (!professorId) {
    return;
  }

  await fetch(`${apiBase}/api/professors/${professorId}`, {
    method: "DELETE",
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

export async function deleteClassGroup(formData: FormData) {
  const classGroupId = Number(formData.get("classGroupId") ?? 0);
  if (!classGroupId) {
    return;
  }

  await fetch(`${apiBase}/api/class-groups/${classGroupId}`, {
    method: "DELETE",
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

export async function deleteSubject(formData: FormData) {
  const subjectId = Number(formData.get("subjectId") ?? 0);
  if (!subjectId) {
    return;
  }

  await fetch(`${apiBase}/api/subjects/${subjectId}`, {
    method: "DELETE",
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

export async function deleteDemand(formData: FormData) {
  const demandId = Number(formData.get("demandId") ?? 0);
  if (!demandId) {
    return;
  }

  await fetch(`${apiBase}/api/demands/${demandId}`, {
    method: "DELETE",
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

export async function deleteTimeslot(formData: FormData) {
  const timeslotId = Number(formData.get("timeslotId") ?? 0);
  if (!timeslotId) {
    return;
  }

  await fetch(`${apiBase}/api/timeslots/${timeslotId}`, {
    method: "DELETE",
  });

  revalidatePath("/");
}

export async function createUnavailability(formData: FormData) {
  const payload = {
    professorId: Number(formData.get("professorId") ?? 0),
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
  };

  if (!payload.professorId || !payload.dayOfWeek || !payload.startTime || !payload.endTime) {
    return;
  }

  await fetch(`${apiBase}/api/unavailability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  revalidatePath("/");
}

export async function deleteUnavailability(formData: FormData) {
  const unavailabilityId = Number(formData.get("unavailabilityId") ?? 0);
  if (!unavailabilityId) {
    return;
  }

  await fetch(`${apiBase}/api/unavailability/${unavailabilityId}`, {
    method: "DELETE",
  });

  revalidatePath("/");
}
