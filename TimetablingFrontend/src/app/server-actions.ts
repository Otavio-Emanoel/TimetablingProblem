"use server";

import { revalidatePath } from "next/cache";

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

export async function createProfessor(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    throw new Error("Nome e obrigatorio");
  }

  const response = await fetch(`${apiBase}/api/professors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro API (${response.status}): ${errorText}`);
  }

  revalidatePath("/");
}

export async function updateProfessor(formData: FormData) {
  const id = Number(formData.get("professorId") ?? 0);
  const name = String(formData.get("name") ?? "").trim();

  if (!id || !name) {
    throw new Error("ID e Nome sao obrigatorios");
  }

  const response = await fetch(`${apiBase}/api/professors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar professor: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteProfessor(formData: FormData) {
  const id = Number(formData.get("professorId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/professors/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar: ${response.status}`);
  }

  revalidatePath("/");
}

export async function createClassGroup(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.name) {
    throw new Error("Nome da turma e obrigatorio");
  }

  const response = await fetch(`${apiBase}/api/class-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar turma: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteClassGroup(formData: FormData) {
  const id = Number(formData.get("classGroupId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/class-groups/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar turma: ${response.status}`);
  }

  revalidatePath("/");
}

export async function createSubject(formData: FormData) {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    classGroupId: Number(formData.get("classGroupId") ?? 0),
  };

  if (!payload.name || !payload.classGroupId) {
    throw new Error("Dados invalidos");
  }

  const response = await fetch(`${apiBase}/api/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar materia: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteSubject(formData: FormData) {
  const id = Number(formData.get("subjectId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/subjects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar materia: ${response.status}`);
  }

  revalidatePath("/");
}

export async function createDemand(formData: FormData) {
  const professorIds = formData.getAll("professorIds").map(Number);

  const payload = {
    subjectId: Number(formData.get("subjectId") ?? 0),
    professorIds,
    quantityPerWeek: Number(formData.get("quantityPerWeek") ?? 0),
    allowDoubleLesson: formData.get("allowDoubleLesson") === "on",
  };

  if (!payload.subjectId || payload.quantityPerWeek <= 0) {
    throw new Error("Demanda invalida");
  }

  const response = await fetch(`${apiBase}/api/demands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar demanda: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteDemand(formData: FormData) {
  const id = Number(formData.get("demandId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/demands/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar demanda: ${response.status}`);
  }

  revalidatePath("/");
}

export async function startSolver() {
  const response = await fetch(`${apiBase}/api/solver/iniciar`, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erro ao iniciar solver: ${response.status}`);
  }
}

export async function validateSolver() {
  const response = await fetch(`${apiBase}/api/solver/validar`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { feasible: false, totalLessons: 0, totalSlots: 0, errors: ["Erro ao validar"], warnings: [] };
  }

  return response.json();
}

export async function getSolverStatus() {
  const response = await fetch(`${apiBase}/api/solver/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { status: "ERROR", details: null, scheduled: null, unscheduled: null };
  }

  return response.json();
}

export async function fetchGradeForClass(classGroupId: number) {
  const response = await fetch(`${apiBase}/api/grade/${classGroupId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function fetchAllGrades(): Promise<Record<string, { id: number; name: string; shiftType: string; entries: Array<{ dayOfWeek: number; startTime: string; endTime: string; subject: string; professors: string[] }> }>> {
  const response = await fetch(`${apiBase}/api/grade/todas`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  return response.json();
}

export async function createTimeslot(formData: FormData) {
  const payload = {
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.dayOfWeek || !payload.startTime || !payload.endTime) {
    throw new Error("Horario invalido");
  }

  const response = await fetch(`${apiBase}/api/timeslots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar horario: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteTimeslot(formData: FormData) {
  const id = Number(formData.get("timeslotId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/timeslots/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar horario: ${response.status}`);
  }

  revalidatePath("/");
}

export async function createUnavailability(formData: FormData) {
  const professorId = Number(formData.get("professorId") ?? 0);
  const dayOfWeek = Number(formData.get("dayOfWeek") ?? -1);
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();

  if (!professorId || dayOfWeek < 0 || !startTime || !endTime) {
    throw new Error("Indisponibilidade invalida");
  }

  const payload = { professorId, dayOfWeek, startTime, endTime };

  const response = await fetch(`${apiBase}/api/unavailability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar indisponibilidade: ${response.status}`);
  }

  revalidatePath("/");
}

export async function deleteUnavailability(formData: FormData) {
  const id = Number(formData.get("unavailabilityId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/unavailability/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar indisponibilidade: ${response.status}`);
  }

  revalidatePath("/");
}

// ===================== PREFERÊNCIAS =====================

export async function fetchPreferences() {
  const response = await fetch(`${apiBase}/api/preferences`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function createPreference(formData: FormData) {
  const professorId = Number(formData.get("professorId") ?? 0);
  const subjectId = formData.get("subjectId") ? Number(formData.get("subjectId")) : null;
  const dayOfWeek = Number(formData.get("dayOfWeek") ?? 0);
  const startTime = String(formData.get("startTime") ?? "").trim() || null;
  const endTime = String(formData.get("endTime") ?? "").trim() || null;
  const weight = Number(formData.get("weight") ?? 5);
  const type = String(formData.get("type") ?? "PREFERRED").trim();

  if (!professorId) {
    throw new Error("Professor é obrigatório");
  }

  const payload = {
    professorId,
    subjectId: subjectId && subjectId > 0 ? subjectId : null,
    dayOfWeek,
    startTime,
    endTime,
    weight,
    type,
  };

  const response = await fetch(`${apiBase}/api/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao criar preferência: ${errorText}`);
  }

  revalidatePath("/");
}

export async function deletePreference(formData: FormData) {
  const id = Number(formData.get("preferenceId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/preferences/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Erro ao deletar preferência: ${response.status}`);
  }

  revalidatePath("/");
}
