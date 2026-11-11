import {
  SummaryResponse,
  Professor,
  ClassGroup,
  Subject,
  Demand,
  Timeslot,
  Unavailability,
  GradeEntry,
  ProfessorPreference,
} from "@/types";

export function getApiBaseUrl(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080"
  );
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const apiUrl = getApiBaseUrl();
  const res = await fetch(`${apiUrl}/api/${endpoint}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Erro ao carregar ${endpoint}: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSummary: () => fetchAPI<SummaryResponse>("summary"),
  getProfessors: () => fetchAPI<Professor[]>("professors"),
  getClasses: () => fetchAPI<ClassGroup[]>("class-groups"),
  getSubjects: () => fetchAPI<Subject[]>("subjects"),
  getDemands: () => fetchAPI<Demand[]>("demands"),
  getTimeslots: () => fetchAPI<Timeslot[]>("timeslots"),
  getUnavailability: () => fetchAPI<Unavailability[]>("unavailability"),
  getPreferences: () => fetchAPI<ProfessorPreference[]>("preferences"),
  getGrade: (classId: number) => fetchAPI<GradeEntry[]>(`grade/${classId}`),
};
