"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  BookOpen,
  Clock,
  LayoutDashboard,
  Plus,
  Trash2,
  GraduationCap,
  AlertCircle,
  Download,
  Loader,
  ShieldAlert,
  Star,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as Actions from "@/app/server-actions";
import {
  Professor,
  ClassGroup,
  Subject,
  Demand,
  Timeslot,
  Unavailability,
  SummaryResponse,
  GradeEntry,
  ClassGradeData,
  ProfessorPreference,
} from "@/types";

// --- SUB-COMPONENTS ---
interface CardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ size: number }>;
  color: string;
}

const Card = ({ title, value, icon: Icon, color }: CardProps) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} text-white`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ size: number }>;
}

const ActionButton = ({ onClick, label, icon: Icon }: ActionButtonProps) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
  >
    <Icon size={16} /> {label}
  </button>
);

interface TableHeaderProps {
  cols: string[];
}

const TableHeader = ({ cols }: TableHeaderProps) => (
  <thead className="bg-slate-50 border-b border-slate-200">
    <tr>
      {cols.map((c) => (
        <th
          key={c}
          className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
        >
          {c}
        </th>
      ))}
      <th className="px-6 py-3 text-right">Ações</th>
    </tr>
  </thead>
);

// --- MODAL COMPONENT ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- MAIN CLIENT COMPONENT ---
interface DashboardProps {
  data: {
    summary: SummaryResponse;
    professors: Professor[];
    classGroups: ClassGroup[];
    subjects: Subject[];
    demands: Demand[];
    timeslots: Timeslot[];
    unavailability: Unavailability[];
    preferences: ProfessorPreference[];
    initialGrade: GradeEntry[];
  };
}

const dayLabels: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
};

export default function Dashboard({ data }: DashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<number | null>(
    data.classGroups[0]?.id ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [solverModalOpen, setSolverModalOpen] = useState(false);
  const [solverProgress, setSolverProgress] = useState(0);
  const [solverStatus, setSolverStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [solverMessage, setSolverMessage] = useState("");

  // Estado dinâmico da grade (carregada do servidor)
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>(data.initialGrade);
  const [gradeLoading, setGradeLoading] = useState(false);

  // Estado para todas as grades
  const [allGradesData, setAllGradesData] = useState<Record<string, ClassGradeData>>({});
  const [allGradesLoading, setAllGradesLoading] = useState(false);

  // Refs para os formulários
  const professorFormRef = useRef<HTMLFormElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);
  const subjectFormRef = useRef<HTMLFormElement>(null);
  const demandFormRef = useRef<HTMLFormElement>(null);
  const timeslotFormRef = useRef<HTMLFormElement>(null);

  // Função para buscar a grade de uma turma
  const loadGrade = useCallback(async (classGroupId: number | null) => {
    if (!classGroupId) {
      setGradeEntries([]);
      return;
    }
    setGradeLoading(true);
    try {
      const entries = await Actions.fetchGradeForClass(classGroupId);
      setGradeEntries(entries);
    } catch {
      setGradeEntries([]);
    } finally {
      setGradeLoading(false);
    }
  }, []);

  // Recarregar grade quando a turma selecionada muda
  useEffect(() => {
    loadGrade(selectedClassGroupId);
  }, [selectedClassGroupId, loadGrade]);

  // Função para carregar todas as grades
  const loadAllGrades = useCallback(async () => {
    setAllGradesLoading(true);
    try {
      const result = await Actions.fetchAllGrades();
      setAllGradesData(result);
    } catch {
      setAllGradesData({});
    } finally {
      setAllGradesLoading(false);
    }
  }, []);

  // Carregar todas as grades quando abrir a aba
  useEffect(() => {
    if (activeTab === "allGrades") {
      loadAllGrades();
    }
  }, [activeTab, loadAllGrades]);

  const openModal = (type: string) => {
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    // Reset all forms com delay para garantir
    setTimeout(() => {
      [
        professorFormRef.current,
        classFormRef.current,
        subjectFormRef.current,
        demandFormRef.current,
        timeslotFormRef.current,
      ].forEach((form) => {
        if (form) {
          form.reset();
          // Limpar também os checkboxes e selects
          const inputs = form.querySelectorAll(
            'input[type="checkbox"], input[type="text"], input[type="number"], input[type="time"], select'
          );
          inputs.forEach((input: any) => {
            if (input.type === "checkbox") {
              input.checked = false;
            }
          });
        }
      });
    }, 100);
  };

  // Handler para enviar e fechar modal
  const handleFormSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<void>
  ) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(() => {
      void action(formData)
        .then(() => {
          closeModal();
        })
        .catch((error) => {
          console.error("Erro ao salvar:", error);
          alert(`Erro ao salvar: ${error?.message ?? "Erro desconhecido"}`);
        });
    });
  };

  // Handler para executar o solver com validação prévia e polling
  const handleRunSolver = async () => {
    setSolverModalOpen(true);
    setSolverStatus("running");
    setSolverProgress(5);
    setSolverMessage("Validando dados...");

    try {
      // Etapa 1: Validação pré-solver
      const validation = await Actions.validateSolver();

      if (validation.errors && validation.errors.length > 0) {
        setSolverStatus("error");
        setSolverMessage(
          `❌ Problemas encontrados:\n${validation.errors.join("\n")}`
        );
        return;
      }

      if (validation.warnings && validation.warnings.length > 0) {
        setSolverMessage(
          `⚠️ Avisos: ${validation.warnings.join(" | ")}\nIniciando solver com ${validation.totalLessons} aulas...`
        );
      } else {
        setSolverMessage(
          `Validação OK (${validation.totalLessons} aulas, ${validation.totalSlots} slots). Iniciando solver...`
        );
      }

      setSolverProgress(15);

      // Etapa 2: Iniciar o solver
      await Actions.startSolver();
      
      const intervalId = setInterval(async () => {
        try {
          const statusData = await Actions.getSolverStatus();
          
          if (statusData.status === "COMPLETED") {
            clearInterval(intervalId);
            setSolverStatus("success");
            setSolverProgress(100);
            const msg = statusData.details
              ? statusData.details
              : `Sucesso! ${statusData.scheduled ?? 0} aulas agendadas.`;
            setSolverMessage(msg);
            
            // Recarregar a grade da turma selecionada
            await loadGrade(selectedClassGroupId);
            
            setTimeout(() => {
              setSolverModalOpen(false);
              router.refresh();
            }, 1500);
          } else if (statusData.status === "ERROR") {
            clearInterval(intervalId);
            setSolverStatus("error");
            setSolverMessage(statusData.details ?? "Ocorreu um erro interno no algoritmo.");
          } else {
            setSolverProgress((prev) => Math.min(prev + 5, 90));
          }
        } catch (err) {
          // continua tentando
        }
      }, 1000);

    } catch (error: any) {
      setSolverStatus("error");
      setSolverMessage(`Erro de conexão: ${error?.message ?? "Erro desconhecido"}`);
    }
  };

  // Copia estilos computados do DOM original para o clone (evita funções CSS não suportadas como lab())
  const copyComputedStylesToClone = (originalRoot: HTMLElement, clonedRoot: HTMLElement) => {
    const sanitizeValue = (prop: string, value: string) => {
      const lower = value.toLowerCase();
      const hasUnsupportedColor =
        lower.includes("lab(") ||
        lower.includes("lch(") ||
        lower.includes("oklch(") ||
        lower.includes("color(");

      if (!hasUnsupportedColor) return value;

      if (prop.includes("box-shadow") || prop.includes("text-shadow")) {
        return "none";
      }

      if (prop.includes("background")) return "#ffffff";
      if (prop.includes("border")) return "#e2e8f0";
      if (prop.includes("color")) return "#0f172a";
      if (prop.includes("fill") || prop.includes("stroke")) return "#0f172a";

      return "";
    };

    try {
      // Remover folhas de estilo no clone para evitar recomputar cores com lab()
      const head = clonedRoot.ownerDocument?.head;
      if (head) {
        head.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => node.remove());
      }

      // copia para o próprio root
      const rootStyle = window.getComputedStyle(originalRoot);
      for (let i = 0; i < rootStyle.length; i++) {
        const prop = rootStyle[i];
        const val = rootStyle.getPropertyValue(prop);
        const prio = rootStyle.getPropertyPriority(prop);
        const sanitized = sanitizeValue(prop, val);
        if (!sanitized) continue;
        try {
          clonedRoot.style.setProperty(prop, sanitized, prio);
        } catch {}
      }

      const originals = Array.from(originalRoot.querySelectorAll<HTMLElement>("*"));
      const clones = Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"));

      const len = Math.min(originals.length, clones.length);
      for (let idx = 0; idx < len; idx++) {
        const o = originals[idx];
        const c = clones[idx];
        const cs = window.getComputedStyle(o);
        for (let j = 0; j < cs.length; j++) {
          const prop = cs[j];
          const val = cs.getPropertyValue(prop);
          const prio = cs.getPropertyPriority(prop);
          const sanitized = sanitizeValue(prop, val);
          if (!sanitized) continue;
          try {
            c.style.setProperty(prop, sanitized, prio);
          } catch {}
        }
      }
    } catch (err) {
      // falhar silenciosamente — não bloquear export
      // eslint-disable-next-line no-console
      console.warn("copyComputedStylesToClone falhou:", err);
    }
  };

  // Função para exportar a grade como PDF
  const exportGradePDF = async () => {
    const gradeTable = document.getElementById("grade-table");
    if (!gradeTable) {
      alert("Tabela de grade não encontrada");
      return;
    }

    try {
      const canvas = await html2canvas(gradeTable, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          try {
            const cloned = clonedDoc.getElementById("grade-table");
            if (cloned) copyComputedStylesToClone(gradeTable, cloned);
          } catch (err) {
            // não bloquear export
          }
        },
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 290;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      
      // Adicionar título
      pdf.setFontSize(16);
      pdf.text("Grade Horária - EtecFlow", 14, 8);
      
      pdf.save("grade-horaria.pdf");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao exportar PDF");
    }
  };

  // Calcular shift type selecionado
  const selectedClassGroup = data.classGroups.find(
    (g) => g.id === selectedClassGroupId
  );
  const shiftType = selectedClassGroup?.shiftType ?? "REGULAR";

  // Função auxiliar para normalizar horário (remove segundos se existirem)
  // Ex: "08:00:00" -> "08:00"
  const normalizeTime = (time: string) => {
    if (!time) return "";
    return time.split(":").slice(0, 2).join(":");
  };

  // Filtrar timeslots por turno selecionado
  const timeslotsForShift = data.timeslots
    .filter((slot) => slot.shiftType === shiftType)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Construir timeRows únicos (Normalizando as chaves)
  const timeRows = Array.from(
    new Map(
      timeslotsForShift.map((slot) => {
        const key = `${normalizeTime(slot.startTime)}-${normalizeTime(slot.endTime)}`;
        return [
          key,
          {
            startTime: normalizeTime(slot.startTime),
            endTime: normalizeTime(slot.endTime),
            originalStart: slot.startTime, // Mantém original para debug se precisar
            originalEnd: slot.endTime,
          },
        ];
      })
    ).values()
  );

  // Construir grade map com dados dinâmicos (Normalizando as chaves)
  const gradeMap = new Map<string, GradeEntry>();

  gradeEntries.forEach((entry) => {
    const key = `${entry.dayOfWeek}-${normalizeTime(entry.startTime)}-${normalizeTime(entry.endTime)}`;
    gradeMap.set(key, entry);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            EtecFlow
          </h1>
          <p className="text-xs text-slate-400 mt-1">Timetabling Solver</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
            { id: "professors", label: "Professores", icon: Users },
            { id: "classes", label: "Turmas", icon: GraduationCap },
            { id: "subjects", label: "Matérias", icon: BookOpen },
            { id: "demands", label: "Demandas", icon: AlertCircle },
            { id: "timeslots", label: "Horários", icon: Clock },
            { id: "restrictions", label: "Restrições", icon: ShieldAlert },
            { id: "preferences", label: "Preferências", icon: Star },
            { id: "grade", label: "Grade Final", icon: Calendar },
            { id: "allGrades", label: "Todas as Grades", icon: GraduationCap },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-8">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                title="Professores"
                value={data.summary.professors}
                icon={Users}
                color="bg-blue-500"
              />
              <Card
                title="Turmas"
                value={data.summary.classGroups}
                icon={GraduationCap}
                color="bg-emerald-500"
              />
              <Card
                title="Matérias"
                value={data.summary.subjects}
                icon={BookOpen}
                color="bg-violet-500"
              />
              <Card
                title="Slots Alocados"
                value={data.summary.scheduleEntries ?? 0}
                icon={Calendar}
                color="bg-orange-500"
              />
            </div>

            <div className="bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-2">Pronto para gerar?</h3>
                <p className="text-slate-300 max-w-lg">
                  O solver irá processar todas as restrições, horários e
                  demandas para criar a melhor grade possível.
                </p>
              </div>
              <button 
                onClick={handleRunSolver}
                disabled={isPending}
                className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Rodar Solver Agora"
                )}
              </button>
            </div>
          </div>
        )}

        {/* PROFESSORS TAB */}
        {activeTab === "professors" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Gerenciar Professores
              </h2>
              <ActionButton
                onClick={() => openModal("createProfessor")}
                label="Novo Professor"
                icon={Plus}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["ID", "Nome", "Indisponibilidades"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.professors.map((prof) => (
                    <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">
                        #{prof.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {prof.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {
                          data.unavailability.filter(
                            (u) => u.professorId === prof.id
                          ).length
                        }{" "}
                        registros
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={Actions.deleteProfessor}>
                          <input
                            type="hidden"
                            name="professorId"
                            value={prof.id}
                          />
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.professors.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum professor cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLASSES TAB */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">Turmas & Turnos</h2>
              <ActionButton
                onClick={() => openModal("createClass")}
                label="Nova Turma"
                icon={Plus}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Nome", "Modelo/Turno"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.classGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{group.name}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            group.shiftType === "INTEGRAL"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {group.shiftType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={Actions.deleteClassGroup}>
                          <input
                            type="hidden"
                            name="classGroupId"
                            value={group.id}
                          />
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.classGroups.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma turma cadastrada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBJECTS TAB */}
        {activeTab === "subjects" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Gerenciar Matérias
              </h2>
              <ActionButton
                onClick={() => openModal("createSubject")}
                label="Nova Matéria"
                icon={Plus}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Nome", "Turma"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.subjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">{subject.name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {subject.classGroup?.name}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={Actions.deleteSubject}>
                          <input
                            type="hidden"
                            name="subjectId"
                            value={subject.id}
                          />
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.subjects.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma matéria cadastrada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEMANDS TAB */}
        {activeTab === "demands" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Demandas e Co-Teaching
              </h2>
              <ActionButton
                onClick={() => openModal("createDemand")}
                label="Nova Demanda"
                icon={Plus}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Matéria", "Turma", "Qtd", "Professores"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.demands.map((demand) => (
                    <tr key={demand.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">
                        {demand.subject?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {demand.subject?.classGroup?.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {demand.quantityPerWeek}x
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {demand.professors
                          .map((p) => p.name)
                          .join(", ")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={Actions.deleteDemand}>
                          <input
                            type="hidden"
                            name="demandId"
                            value={demand.id}
                          />
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.demands.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma demanda cadastrada. Crie turmas e matérias primeiro.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMESLOTS TAB */}
        {activeTab === "timeslots" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Horários por Turno
              </h2>
              <ActionButton
                onClick={() => openModal("createTimeslot")}
                label="Novo Horário"
                icon={Plus}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Dia", "Início", "Fim", "Turno"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.timeslots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium">
                        {dayLabels[slot.dayOfWeek] ?? slot.dayOfWeek}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {slot.startTime}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {slot.endTime}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            slot.shiftType === "INTEGRAL"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {slot.shiftType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={Actions.deleteTimeslot}>
                          <input
                            type="hidden"
                            name="timeslotId"
                            value={slot.id}
                          />
                          <button className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.timeslots.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum horário cadastrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESTRIÇÕES TAB */}
        {activeTab === "restrictions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Restrições de Horário
              </h2>
              <ActionButton
                onClick={() => openModal("createRestriction")}
                label="Nova Restrição"
                icon={Plus}
              />
            </div>
            <p className="text-slate-500 text-sm">
              Defina horários em que um professor <strong>não pode</strong> dar aula.
              Use &ldquo;Todos os dias&rdquo; para bloquear um horário de segunda a sexta.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Professor", "Dia", "Início", "Fim"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.unavailability.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        Nenhuma restrição cadastrada.
                      </td>
                    </tr>
                  ) : (
                    data.unavailability.map((u) => {
                      const profName = u.professorName
                        ?? data.professors.find((p) => p.id === u.professorId)?.name
                        ?? `Prof #${u.professorId}`;
                      const dayName = u.dayOfWeek === 0
                        ? "Todos os dias"
                        : dayLabels[u.dayOfWeek] ?? `Dia ${u.dayOfWeek}`;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {profName}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.dayOfWeek === 0
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {dayName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {u.startTime.substring(0, 5)}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {u.endTime.substring(0, 5)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <form
                              action={(formData) =>
                                startTransition(() => {
                                  void Actions.deleteUnavailability(formData).then(() => router.refresh());
                                })
                              }
                            >
                              <input type="hidden" name="unavailabilityId" value={u.id} />
                              <button
                                type="submit"
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PREFERÊNCIAS TAB */}
        {activeTab === "preferences" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                Preferências de Professores
              </h2>
              <ActionButton
                onClick={() => openModal("createPreference")}
                label="Nova Preferência"
                icon={Plus}
              />
            </div>
            <p className="text-slate-500 text-sm">
              Defina preferências de horário para professores. Use <strong>PREFERIDO</strong> para indicar horários desejados
              e <strong>EVITAR</strong> para horários indesejados. O peso (1-10) controla a importância — o solver tentará
              respeitar preferências de maior peso primeiro.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <TableHeader cols={["Professor", "Matéria", "Dia", "Horário", "Peso", "Tipo"]} />
                <tbody className="divide-y divide-slate-100">
                  {data.preferences.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        Nenhuma preferência cadastrada.
                      </td>
                    </tr>
                  ) : (
                    data.preferences.map((pref) => {
                      const profName = pref.professorName
                        ?? data.professors.find((p) => p.id === pref.professorId)?.name
                        ?? `Prof #${pref.professorId}`;
                      const subjName = pref.subjectName ?? (pref.subjectId
                        ? data.subjects.find((s) => s.id === pref.subjectId)?.name ?? `Matéria #${pref.subjectId}`
                        : "Qualquer");
                      const dayName = pref.dayOfWeek === 0
                        ? "Qualquer dia"
                        : dayLabels[pref.dayOfWeek] ?? `Dia ${pref.dayOfWeek}`;
                      const timeStr = pref.startTime && pref.endTime
                        ? `${pref.startTime.substring(0, 5)} - ${pref.endTime.substring(0, 5)}`
                        : "Qualquer horário";
                      return (
                        <tr key={pref.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {profName}
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">
                            {subjName}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {dayName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">
                            {timeStr}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                              pref.weight >= 8 ? "bg-orange-100 text-orange-800" :
                              pref.weight >= 5 ? "bg-yellow-100 text-yellow-800" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {pref.weight}/10
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pref.type === "PREFERRED"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {pref.type === "PREFERRED" ? "Preferido" : "Evitar"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <form
                              action={(formData) =>
                                startTransition(() => {
                                  void Actions.deletePreference(formData).then(() => router.refresh());
                                })
                              }
                            >
                              <input type="hidden" name="preferenceId" value={pref.id} />
                              <button
                                type="submit"
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRADE FINAL TAB */}
        {activeTab === "grade" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">Grade Horária</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportGradePDF}
                  disabled={gradeLoading || gradeEntries.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <select
                  value={selectedClassGroupId ?? ""}
                  onChange={(e) =>
                    setSelectedClassGroupId(Number(e.target.value))
                  }
                  className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {data.classGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {data.classGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre turmas primeiro para visualizar a grade.
              </div>
            ) : gradeLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={20} />
                Carregando grade...
              </div>
            ) : timeRows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre horários para visualizar a grade.
              </div>
            ) : gradeEntries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Nenhuma aula alocada para esta turma. Rode o solver primeiro.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full" id="grade-table">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Horário
                      </th>
                      {[
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                      ].map((day) => (
                        <th
                          key={day}
                          className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timeRows.map((row, rowIdx) => (
                      <tr key={`${row.startTime}-${row.endTime}`}>
                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                          {row.startTime} - {row.endTime}
                        </td>
                        {[1, 2, 3, 4, 5].map((dayOfWeek) => {
                          // Usa a chave normalizada para buscar
                          const key = `${dayOfWeek}-${row.startTime}-${row.endTime}`;
                          const entry = gradeMap.get(key);

                          return (
                            <td
                              key={`${rowIdx}-${dayOfWeek}`}
                              className="px-6 py-4 text-center border-l border-slate-100"
                            >
                              {entry ? (
                                <div className="space-y-1 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                  <p className="text-sm font-bold text-blue-800">
                                    {entry.subject}
                                  </p>
                                  <p className="text-xs text-blue-600 font-medium">
                                    {entry.professors.join(", ")}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TODAS AS GRADES TAB */}
        {activeTab === "allGrades" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">Todas as Grades</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    const container = document.getElementById("all-grades-container");
                    if (!container) return;
                    try {
                      const canvas = await html2canvas(container, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#ffffff",
                        onclone: (clonedDoc) => {
                          try {
                            const cloned = clonedDoc.getElementById("all-grades-container");
                            if (cloned) copyComputedStylesToClone(container, cloned);
                          } catch (err) {
                            // ignore
                          }
                        },
                      });
                      const imgData = canvas.toDataURL("image/png");
                      const pdf = new jsPDF({
                        orientation: "landscape",
                        unit: "mm",
                        format: "a4",
                      });
                      const pageWidth = 290;
                      const pageHeight = 200;
                      const imgWidth = pageWidth;
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      
                      if (imgHeight <= pageHeight) {
                        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
                      } else {
                        // Split across pages
                        let yOffset = 0;
                        while (yOffset < imgHeight) {
                          if (yOffset > 0) pdf.addPage();
                          pdf.addImage(imgData, "PNG", 10, 10 - yOffset, imgWidth, imgHeight);
                          yOffset += pageHeight;
                        }
                      }
                      pdf.save("todas-as-grades.pdf");
                    } catch (err) {
                      console.error("Erro ao exportar PDF:", err);
                    }
                  }}
                  disabled={allGradesLoading || Object.keys(allGradesData).length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <button
                  onClick={loadAllGrades}
                  disabled={allGradesLoading}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {allGradesLoading ? <Loader size={16} className="animate-spin" /> : null}
                  Atualizar
                </button>
              </div>
            </div>

            {allGradesLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={20} />
                Carregando todas as grades...
              </div>
            ) : Object.keys(allGradesData).length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Nenhuma grade gerada. Rode o solver primeiro.
              </div>
            ) : (
              <div id="all-grades-container" className="space-y-8">
                {Object.entries(allGradesData).map(([className, classData]) => {
                  const classShift = classData.shiftType;
                  const classTimeslots = data.timeslots
                    .filter((slot) => slot.shiftType === classShift)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  const classTimeRows = Array.from(
                    new Map(
                      classTimeslots.map((slot) => {
                        const key = `${normalizeTime(slot.startTime)}-${normalizeTime(slot.endTime)}`;
                        return [
                          key,
                          {
                            startTime: normalizeTime(slot.startTime),
                            endTime: normalizeTime(slot.endTime),
                          },
                        ];
                      })
                    ).values()
                  );

                  const classGradeMap = new Map<string, GradeEntry>();
                  classData.entries.forEach((entry) => {
                    const key = `${entry.dayOfWeek}-${normalizeTime(entry.startTime)}-${normalizeTime(entry.endTime)}`;
                    classGradeMap.set(key, entry);
                  });

                  const shiftColors: Record<string, string> = {
                    INTEGRAL: "from-indigo-600 to-blue-600",
                    REGULAR: "from-emerald-600 to-teal-600",
                  };

                  const cellColors: Record<string, { bg: string; border: string; text: string; subText: string }> = {
                    INTEGRAL: { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-800", subText: "text-indigo-600" },
                    REGULAR: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-800", subText: "text-emerald-600" },
                  };

                  const colors = cellColors[classShift] ?? cellColors.REGULAR;

                  return (
                    <div key={classData.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className={`bg-linear-to-r ${shiftColors[classShift] ?? shiftColors.REGULAR} px-6 py-3 flex items-center justify-between`}>
                        <h3 className="text-lg font-bold text-white">{className}</h3>
                        <span className="text-xs font-medium text-white/80 bg-white/20 px-3 py-1 rounded-full">
                          {classShift === "INTEGRAL" ? "Integral" : "Regular"} • {classData.entries.length} aulas
                        </span>
                      </div>
                      {classTimeRows.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">
                          Sem horários cadastrados para o turno {classShift}.
                        </div>
                      ) : classData.entries.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">
                          Nenhuma aula alocada para esta turma.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
                                  Horário
                                </th>
                                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
                                  <th key={day} className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    {day}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classTimeRows.map((row) => (
                                <tr key={`${row.startTime}-${row.endTime}`}>
                                  <td className="px-4 py-3 font-medium text-slate-700 text-sm whitespace-nowrap">
                                    {row.startTime} - {row.endTime}
                                  </td>
                                  {[1, 2, 3, 4, 5].map((dayOfWeek) => {
                                    const key = `${dayOfWeek}-${row.startTime}-${row.endTime}`;
                                    const entry = classGradeMap.get(key);
                                    return (
                                      <td key={dayOfWeek} className="px-4 py-3 text-center border-l border-slate-100">
                                        {entry ? (
                                          <div className={`space-y-0.5 ${colors.bg} p-2 rounded-lg border ${colors.border}`}>
                                            <p className={`text-xs font-bold ${colors.text}`}>
                                              {entry.subject}
                                            </p>
                                            <p className={`text-[10px] ${colors.subText} font-medium`}>
                                              {entry.professors.join(", ")}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 text-xs">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS AREA */}
      <Modal
        isOpen={isModalOpen && modalType === "createProfessor"}
        onClose={closeModal}
        title="Novo Professor"
      >
        <form
          ref={professorFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createProfessor)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome Completo
            </label>
            <input
              name="name"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Otavio Emanoel"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createClass"}
        onClose={closeModal}
        title="Nova Turma"
      >
        <form
          ref={classFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createClassGroup)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da Turma
            </label>
            <input
              name="name"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: 3º DS - AMS"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Modelo
            </label>
            <select
              name="shiftType"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="REGULAR">Regular (Manhã/Tarde)</option>
              <option value="INTEGRAL">Integral (M-Tec/AMS)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar Turma"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createSubject"}
        onClose={closeModal}
        title="Nova Matéria"
      >
        <form
          ref={subjectFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createSubject)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da Matéria
            </label>
            <input
              name="name"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Matemática"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Turma
            </label>
            <select
              name="classGroupId"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Selecione uma turma</option>
              {data.classGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-violet-600 text-white py-2 rounded-lg font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar Matéria"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createDemand"}
        onClose={closeModal}
        title="Nova Demanda"
      >
        <form
          ref={demandFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createDemand)}
          className="flex flex-col gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Matéria
            </label>
            <select
              name="subjectId"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Selecione</option>
              {data.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} - {subject.classGroup?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantidade de Aulas
            </label>
            <input
              name="quantityPerWeek"
              type="number"
              min={1}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Professores (Co-Teaching)
            </label>
            <div className="space-y-2 border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto">
              {data.professors.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Cadastre professores primeiro
                </p>
              ) : (
                data.professors.map((prof) => (
                  <label key={prof.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="professorIds"
                      value={prof.id}
                    />
                    <span className="text-sm">{prof.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowDoubleLesson" />
            Permite aula dupla (geminada)
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar Demanda"}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createTimeslot"}
        onClose={closeModal}
        title="Novo Horário"
      >
        <form
          ref={timeslotFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createTimeslot)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Dia da Semana
            </label>
            <select
              name="dayOfWeek"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Selecione</option>
              <option value="1">Segunda</option>
              <option value="2">Terça</option>
              <option value="3">Quarta</option>
              <option value="4">Quinta</option>
              <option value="5">Sexta</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Início
              </label>
              <input
                name="startTime"
                type="time"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fim
              </label>
              <input
                name="endTime"
                type="time"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Turno
            </label>
            <select
              name="shiftType"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              defaultValue="REGULAR"
            >
              <option value="REGULAR">Regular</option>
              <option value="INTEGRAL">Integral</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar Horário"}
          </button>
        </form>
      </Modal>

      {/* Nova Restrição Modal */}
      <Modal
        isOpen={isModalOpen && modalType === "createRestriction"}
        onClose={closeModal}
        title="Nova Restrição de Horário"
      >
        <form
          onSubmit={(e) => handleFormSubmit(e, Actions.createUnavailability)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professor</label>
            <select
              name="professorId"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {data.professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
            <select
              name="dayOfWeek"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="0">Todos os dias (Seg-Sex)</option>
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Início</label>
              <input
                type="time"
                name="startTime"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fim</label>
              <input
                type="time"
                name="endTime"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Exemplo: para bloquear todas as manhãs de segunda, escolha &ldquo;Segunda-feira&rdquo;, 08:00 a 12:00.
            Para bloquear um horário todos os dias, use &ldquo;Todos os dias&rdquo;.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold transition-colors"
          >
            {isPending ? "Salvando..." : "Criar Restrição"}
          </button>
        </form>
      </Modal>

      {/* Nova Preferência Modal */}
      <Modal
        isOpen={isModalOpen && modalType === "createPreference"}
        onClose={closeModal}
        title="Nova Preferência de Professor"
      >
        <form
          onSubmit={(e) => handleFormSubmit(e, Actions.createPreference)}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professor *</label>
            <select
              name="professorId"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {data.professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Matéria (opcional)</label>
            <select
              name="subjectId"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Qualquer matéria</option>
              {data.subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name} - {s.classGroup?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dia da Semana</label>
            <select
              name="dayOfWeek"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              defaultValue="0"
            >
              <option value="0">Qualquer dia</option>
              <option value="1">Segunda-feira</option>
              <option value="2">Terça-feira</option>
              <option value="3">Quarta-feira</option>
              <option value="4">Quinta-feira</option>
              <option value="5">Sexta-feira</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Início (opcional)</label>
              <input
                type="time"
                name="startTime"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fim (opcional)</label>
              <input
                type="time"
                name="endTime"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Peso (1 = fraco, 10 = forte)
            </label>
            <input
              type="range"
              name="weight"
              min="1"
              max="10"
              defaultValue="5"
              className="w-full"
              onChange={(e) => {
                const label = e.target.nextElementSibling;
                if (label) label.textContent = e.target.value;
              }}
            />
            <span className="text-sm text-slate-500 font-bold">5</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="type" value="PREFERRED" defaultChecked />
                <span className="text-green-700 font-medium">Preferido</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="type" value="AVOID" />
                <span className="text-red-700 font-medium">Evitar</span>
              </label>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Exemplo: Professor Maria prefere dar aula de Matemática nas segundas, 08:00-12:00, peso 8.
            Isso não é uma restrição absoluta — o solver irá <em>tentar</em> atender a preferência.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-bold transition-colors"
          >
            {isPending ? "Salvando..." : "Criar Preferência"}
          </button>
        </form>
      </Modal>

      {/* SOLVER MODAL */}
      {solverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className={`px-6 py-4 border-b border-slate-100 ${
              solverStatus === "error" ? "bg-red-50" :
              solverStatus === "success" ? "bg-green-50" : "bg-slate-50"
            }`}>
              <h3 className="font-semibold text-lg text-slate-800">
                {solverStatus === "running" ? "⏳ Gerando Grade..." : 
                 solverStatus === "success" ? "✅ Grade Gerada com Sucesso!" :
                 "❌ Erro no Solver"}
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                {solverStatus === "running" && (
                  <Loader className="animate-spin text-blue-600" size={40} />
                )}
                {solverStatus === "success" && (
                  <div className="text-green-500">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {solverStatus === "error" && (
                  <AlertCircle className="text-red-500" size={40} />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="text-slate-700 text-sm font-medium whitespace-pre-line text-center">
                  {solverMessage}
                </div>
                {solverStatus === "running" && (
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${solverProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {solverStatus !== "running" && (
                <button
                  onClick={() => setSolverModalOpen(false)}
                  className={`w-full py-2 rounded-lg font-bold transition-colors text-white ${
                    solverStatus === "success"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
