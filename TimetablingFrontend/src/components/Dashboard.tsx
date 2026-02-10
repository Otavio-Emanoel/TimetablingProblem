"use client";

import { useState, useTransition, useRef } from "react";
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

  // Refs para os formulários
  const professorFormRef = useRef<HTMLFormElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);
  const subjectFormRef = useRef<HTMLFormElement>(null);
  const demandFormRef = useRef<HTMLFormElement>(null);
  const timeslotFormRef = useRef<HTMLFormElement>(null);

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

  // Handler para executar o solver com Polling
  const handleRunSolver = async () => {
    setSolverModalOpen(true);
    setSolverStatus("running");
    setSolverProgress(10); // Começa um pouco
    setSolverMessage("Iniciando motor de otimização...");

    try {
      // 1. Dá o comando de partida
      await Actions.startSolver();
      
      // 2. Inicia o Polling (Verificação periódica)
      const intervalId = setInterval(async () => {
        try {
          const statusData = await Actions.getSolverStatus();
          
          if (statusData.status === "COMPLETED") {
            clearInterval(intervalId);
            setSolverStatus("success");
            setSolverProgress(100);
            setSolverMessage(`Sucesso! ${statusData.scheduled ?? 0} aulas agendadas.`);
            
            // Atualiza a tela após 1.5s
            setTimeout(() => {
              setSolverModalOpen(false);
              router.refresh(); // Puxa a grade nova do banco
            }, 1500);
          } else if (statusData.status === "ERROR") {
            clearInterval(intervalId);
            setSolverStatus("error");
            setSolverMessage("Ocorreu um erro interno no algoritmo.");
          } else {
            // Ainda rodando... incrementa a barra fake para dar feedback visual
            setSolverProgress((prev) => Math.min(prev + 5, 90));
          }
        } catch (err) {
          console.error("Erro ao verificar status:", err);
        }
      }, 1000); // Checa a cada 1 segundo

    } catch (error: any) {
      setSolverStatus("error");
      setSolverMessage(`Erro de conexão: ${error?.message ?? "Erro desconhecido"}`);
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

  // Construir grade map (Normalizando as chaves)
  const gradeMap = new Map();

  data.initialGrade.forEach((entry) => {
    // A chave deve bater EXATAMENTE com a chave gerada no loop da tabela
    const key = `${entry.dayOfWeek}-${normalizeTime(entry.startTime)}-${normalizeTime(entry.endTime)}`;
    gradeMap.set(key, entry);
  });

  // Debug no console do navegador para você ver se está batendo
  console.log("Grade Map Keys:", Array.from(gradeMap.keys()));
  console.log("Time Rows:", timeRows);

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
            { id: "grade", label: "Grade Final", icon: Calendar },
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

        {/* GRADE FINAL TAB */}
        {activeTab === "grade" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">Grade Horária</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportGradePDF}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <form className="flex items-center gap-2">
                  <select
                    name="classGroupId"
                    defaultValue={selectedClassGroupId ?? ""}
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
                </form>
              </div>
            </div>

            {data.classGroups.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre turmas primeiro para visualizar a grade.
              </div>
            ) : timeRows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre horários para visualizar a grade.
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
                          const entry = gradeMap.get(
                            `${dayOfWeek}-${row.startTime}-${row.endTime}`
                          );
                          return (
                            <td
                              key={`${rowIdx}-${dayOfWeek}`}
                              className="px-6 py-4 text-center border-l border-slate-100"
                            >
                              {entry ? (
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {entry.subject}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {entry.professors.join(", ")}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
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

      {/* SOLVER MODAL */}
      {solverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-lg text-slate-800">
                {solverStatus === "running" ? "Gerando Grade..." : 
                 solverStatus === "success" ? "Sucesso!" :
                 "Erro"}
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
                <p className="text-slate-700 text-center font-medium">{solverMessage}</p>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition-colors"
                >
                  {solverStatus === "success" ? "Fechar" : "Fechar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
