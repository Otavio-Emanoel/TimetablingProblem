import { api } from "@/services/api";
import Dashboard from "@/components/Dashboard";

export default async function Home({
  searchParams,
}: {
  searchParams?: { classGroupId?: string };
}) {
  // Fetching em paralelo para melhor performance
  const [summary, professors, classGroups, subjects, demands, timeslots, unavailability] =
    await Promise.all([
      api.getSummary().catch(() => ({
        timeslots: 0,
        professors: 0,
        classGroups: 0,
        subjects: 0,
        lessons: 0,
      })),
      api.getProfessors().catch(() => []),
      api.getClasses().catch(() => []),
      api.getSubjects().catch(() => []),
      api.getDemands().catch(() => []),
      api.getTimeslots().catch(() => []),
      api.getUnavailability().catch(() => []),
    ]);

  // Lógica específica para a grade da turma selecionada
  const selectedClassId = searchParams?.classGroupId
    ? Number(searchParams.classGroupId)
    : classGroups[0]?.id ?? null;

  const initialGrade = selectedClassId
    ? await api.getGrade(selectedClassId).catch(() => [])
    : [];

  // Render
  return (
    <Dashboard
      data={{
        summary,
        professors,
        classGroups,
        subjects,
        demands,
        timeslots,
        unavailability,
        initialGrade,
      }}
    />
  );
}
