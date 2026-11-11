"use server";

import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/services/api";
import { ProfessorGradeEntry, ProfessorGradeData } from "@/types";

async function handleApiResponse(response: Response, fallbackMsg: string) {
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("Registro já cadastrado (conflito de duplicidade).");
    }
    const text = await response.text().catch(() => "");
    throw new Error(text ? `${fallbackMsg} (${response.status}): ${text}` : `${fallbackMsg}: ${response.status}`);
  }
}

export async function createProfessor(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    throw new Error("Nome é obrigatório");
  }

  const response = await fetch(`${apiBase}/api/professors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  await handleApiResponse(response, "Erro ao criar professor");
  revalidatePath("/");
}

export async function updateProfessor(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("professorId") ?? 0);
  const name = String(formData.get("name") ?? "").trim();

  if (!id || !name) {
    throw new Error("ID e Nome são obrigatórios");
  }

  const response = await fetch(`${apiBase}/api/professors/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  await handleApiResponse(response, "Erro ao atualizar professor");
  revalidatePath("/");
}

export async function deleteProfessor(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("professorId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/professors/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao remover professor");
  revalidatePath("/");
}

export async function createClassGroup(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.name) {
    throw new Error("Nome da turma é obrigatório");
  }

  const response = await fetch(`${apiBase}/api/class-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao criar turma");
  revalidatePath("/");
}

export async function updateClassGroup(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("classGroupId") ?? 0);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!id || !payload.name) {
    throw new Error("ID e Nome da turma são obrigatórios");
  }

  const response = await fetch(`${apiBase}/api/class-groups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao atualizar turma");
  revalidatePath("/");
}

export async function deleteClassGroup(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("classGroupId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/class-groups/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar turma");
  revalidatePath("/");
}

export async function createSubject(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    classGroupId: Number(formData.get("classGroupId") ?? 0),
  };

  if (!payload.name || !payload.classGroupId) {
    throw new Error("Dados inválidos");
  }

  const response = await fetch(`${apiBase}/api/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao criar matéria");
  revalidatePath("/");
}

export async function deleteSubject(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("subjectId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/subjects/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar matéria");
  revalidatePath("/");
}

export async function createDemand(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const professorIds = formData.getAll("professorIds").map(Number).filter(Boolean);

  const payload = {
    subjectId: Number(formData.get("subjectId") ?? 0),
    professorIds,
    quantityPerWeek: Number(formData.get("quantityPerWeek") ?? 0),
    allowDoubleLesson: formData.get("allowDoubleLesson") === "on",
  };

  if (!payload.subjectId || payload.quantityPerWeek <= 0 || professorIds.length === 0) {
    throw new Error("Selecione a matéria, ao menos um professor e uma quantidade válida.");
  }

  const response = await fetch(`${apiBase}/api/demands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao criar demanda");
  revalidatePath("/");
}

export async function updateDemand(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("demandId") ?? 0);
  const professorIds = formData.getAll("professorIds").map(Number).filter(Boolean);

  const payload = {
    subjectId: Number(formData.get("subjectId") ?? 0),
    professorIds,
    quantityPerWeek: Number(formData.get("quantityPerWeek") ?? 0),
    allowDoubleLesson: formData.get("allowDoubleLesson") === "on",
  };

  if (!id || !payload.subjectId || payload.quantityPerWeek <= 0 || professorIds.length === 0) {
    throw new Error("Dados inválidos para atualização da demanda.");
  }

  const response = await fetch(`${apiBase}/api/demands/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao atualizar demanda");
  revalidatePath("/");
}

export async function deleteDemand(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("demandId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/demands/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar demanda");
  revalidatePath("/");
}

export async function startSolver() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/solver/iniciar`, {
    method: "POST",
    cache: "no-store",
  });

  await handleApiResponse(response, "Erro ao iniciar solver");
}

export async function validateSolver() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/solver/validar`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { feasible: false, totalLessons: 0, totalSlots: 0, errors: ["Erro ao validar"], warnings: [] };
  }

  return response.json();
}

export async function getSolverStatus() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/solver/status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { status: "ERROR", details: null, scheduled: null, unscheduled: null };
  }

  return response.json();
}

export async function fetchGradeForClass(classGroupId: number) {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/grade/${classGroupId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function fetchAllGrades(): Promise<Record<string, { id: number; name: string; shiftType: string; entries: Array<{ dayOfWeek: number; startTime: string; endTime: string; subject: string; professors: string[] }> }>> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/grade/todas`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  return response.json();
}

export async function fetchGradeForProfessor(professorId: number): Promise<ProfessorGradeEntry[]> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/grade/professor/${professorId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function fetchAllProfessorGrades(): Promise<Record<string, ProfessorGradeData>> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/grade/professores`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return {};
  }

  return response.json();
}

export async function clearGrades() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/grade`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao limpar grades");
  revalidatePath("/");
}

export async function resetAllData() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/reset`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao resetar dados");
  revalidatePath("/");
}

export async function createTimeslot(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const payload = {
    dayOfWeek: String(formData.get("dayOfWeek") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    shiftType: String(formData.get("shiftType") ?? "REGULAR").trim(),
  };

  if (!payload.dayOfWeek || !payload.startTime || !payload.endTime) {
    throw new Error("Horário inválido");
  }

  const response = await fetch(`${apiBase}/api/timeslots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao criar horário");
  revalidatePath("/");
}

export async function createDefaultTimeslots(): Promise<{ created: number; total: number }> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/timeslots/padrao`, {
    method: "POST",
    cache: "no-store",
  });

  await handleApiResponse(response, "Erro ao gerar horários padrão");
  revalidatePath("/");
  return response.json();
}

export async function deleteTimeslot(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("timeslotId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/timeslots/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar horário");
  revalidatePath("/");
}

export async function createUnavailability(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const professorId = Number(formData.get("professorId") ?? 0);
  const dayOfWeek = Number(formData.get("dayOfWeek") ?? -1);
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();

  if (!professorId || dayOfWeek < 0 || !startTime || !endTime) {
    throw new Error("Indisponibilidade inválida");
  }

  const payload = { professorId, dayOfWeek, startTime, endTime };

  const response = await fetch(`${apiBase}/api/unavailability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  await handleApiResponse(response, "Erro ao criar indisponibilidade");
  revalidatePath("/");
}

export async function deleteUnavailability(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("unavailabilityId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/unavailability/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar indisponibilidade");
  revalidatePath("/");
}

export async function fetchPreferences() {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/api/preferences`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export async function createPreference(formData: FormData) {
  const apiBase = getApiBaseUrl();
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

  await handleApiResponse(response, "Erro ao criar preferência");
  revalidatePath("/");
}

export async function deletePreference(formData: FormData) {
  const apiBase = getApiBaseUrl();
  const id = Number(formData.get("preferenceId") ?? 0);
  if (!id) {
    return;
  }

  const response = await fetch(`${apiBase}/api/preferences/${id}`, {
    method: "DELETE",
  });

  await handleApiResponse(response, "Erro ao deletar preferência");
  revalidatePath("/");
}
