"use server";

import { revalidatePath } from "next/cache";

const apiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

function getFormValue(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct !== null && direct !== undefined && String(direct).length > 0) {
    return direct;
  }
  for (const [key, value] of formData.entries()) {
    if (key.endsWith(`_${name}`)) {
      return value;
    }
  }
  return null;
}

export async function createProfessor(formData: FormData) {
  try {
    const payload = {
      name: String(getFormValue(formData, "name") ?? "").trim(),
    };

    if (!payload.name) {
      return;
    }

    const response = await fetch(`${apiBase}/api/professors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Error creating professor: ${response.status}`);
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error in createProfessor:", error);
  }
}

export async function updateProfessor(formData: FormData) {
  try {
    const professorId = Number(getFormValue(formData, "professorId") ?? 0);
    const payload = {
      name: String(getFormValue(formData, "name") ?? "").trim(),
    };

    if (!professorId || !payload.name) {
      return;
    }

    const response = await fetch(`${apiBase}/api/professors/${professorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Error updating professor: ${response.status}`);
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error in updateProfessor:", error);
  }
}

export async function deleteProfessor(formData: FormData) {
  try {
    const professorId = Number(getFormValue(formData, "professorId") ?? 0);
    if (!professorId) {
      return;
    }

    const response = await fetch(`${apiBase}/api/professors/${professorId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      console.error(`Error deleting professor: ${response.status}`);
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error in deleteProfessor:", error);
  }
}

export async function createClassGroup(formData: FormData) {
  try {
    const payload = {
      name: String(getFormValue(formData, "name") ?? "").trim(),
      shiftType: String(getFormValue(formData, "shiftType") ?? "REGULAR").trim(),
    };

    if (!payload.name) {
      return;
    }

    const response = await fetch(`${apiBase}/api/class-groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Error creating class group: ${response.status}`);
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error in createClassGroup:", error);
  }
}

export async function deleteClassGroup(formData: FormData) {
  const classGroupId = Number(getFormValue(formData, "classGroupId") ?? 0);
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
      name: String(getFormValue(formData, "name") ?? "").trim(),
      classGroupId: Number(getFormValue(formData, "classGroupId") ?? 0),
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
  const subjectId = Number(getFormValue(formData, "subjectId") ?? 0);
  if (!subjectId) {
    return;
  }

  await fetch(`${apiBase}/api/subjects/${subjectId}`, {
    method: "DELETE",
  });

  revalidatePath("/");
}

export async function createDemand(formData: FormData) {
  const professorIds = formData
    .getAll("professorIds")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const payload = {
    subjectId: Number(getFormValue(formData, "subjectId") ?? 0),
    professorIds,
    quantityPerWeek: Number(getFormValue(formData, "quantityPerWeek") ?? 0),
    allowDoubleLesson:
      String(getFormValue(formData, "allowDoubleLesson") ?? "").trim() === "on",
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
  const demandId = Number(getFormValue(formData, "demandId") ?? 0);
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
  try {
    const payload = {
      dayOfWeek: Number(getFormValue(formData, "dayOfWeek") ?? 0),
      startTime: String(getFormValue(formData, "startTime") ?? "").trim(),
      endTime: String(getFormValue(formData, "endTime") ?? "").trim(),
      shiftType: String(getFormValue(formData, "shiftType") ?? "REGULAR").trim(),
    };

    if (!payload.dayOfWeek || !payload.startTime || !payload.endTime) {
      return;
    }

    const response = await fetch(`${apiBase}/api/timeslots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Error creating timeslot: ${response.status}`);
      return;
    }

    revalidatePath("/");
  } catch (error) {
    console.error("Error in createTimeslot:", error);
  }
}

export async function deleteTimeslot(formData: FormData) {
  const timeslotId = Number(getFormValue(formData, "timeslotId") ?? 0);
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
      professorId: Number(getFormValue(formData, "professorId") ?? 0),
      dayOfWeek: Number(getFormValue(formData, "dayOfWeek") ?? 0),
      startTime: String(getFormValue(formData, "startTime") ?? "").trim(),
      endTime: String(getFormValue(formData, "endTime") ?? "").trim(),
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
  const unavailabilityId = Number(getFormValue(formData, "unavailabilityId") ?? 0);
  if (!unavailabilityId) {
    return;
  }

  await fetch(`${apiBase}/api/unavailability/${unavailabilityId}`, {
    method: "DELETE",
  });

  revalidatePath("/");
}
