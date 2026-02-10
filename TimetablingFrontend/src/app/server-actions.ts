"use server";

import { revalidatePath } from "next/cache";

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://backend:8080";

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
  });

  if (!response.ok) {
    throw new Error(`Erro ao iniciar solver: ${response.status}`);
  }

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
  const payload = {
    professorId: Number(formData.get("professorId") ?? 0),
    dayOfWeek: Number(formData.get("dayOfWeek") ?? 0),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
  };

  if (!payload.professorId || !payload.dayOfWeek || !payload.startTime || !payload.endTime) {
    throw new Error("Indisponibilidade invalida");
  }

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
