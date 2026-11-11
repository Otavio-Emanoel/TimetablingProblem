"use client";

import { useState, useTransition, useRef, useEffect, useCallback, useId } from "react";
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
  Search,
  Sparkles,
  Edit3,
  UserCheck,
  RotateCcw,
  CheckCircle2,
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
  ProfessorGradeEntry,
} from "@/types";

// --- SUB-COMPONENTS ---
interface CardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
}

const Card = ({ title, value, subtitle, icon: Icon, color }: CardProps) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} text-white shrink-0`}>
      <Icon size={24} />
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider truncate">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

const ActionButton = ({
  onClick,
  label,
  icon: Icon,
  variant = "primary",
  disabled = false,
}: ActionButtonProps) => {
  const styles = {
    primary: "bg-slate-900 hover:bg-slate-800 text-white",
    secondary: "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200",
    danger: "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      <Icon size={16} /> {label}
    </button>
  );
};

interface TableHeaderProps {
  cols: string[];
}

const TableHeader = ({ cols }: TableHeaderProps) => (
  <thead className="bg-slate-50 border-b border-slate-200">
    <tr>
      {cols.map((c) => (
        <th
          key={c}
          scope="col"
          className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50"
        >
          {c}
        </th>
      ))}
      <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
        Ações
      </th>
    </tr>
  </thead>
);

// --- NATIVE <dialog> MODAL COMPONENT (modern-web-guidance: dialog) ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback for browsers without native <dialog closedby="any"> support
  const isOutside = (e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement) => {
    const r = dialog.getBoundingClientRect();
    return (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, unknown>)}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = "";
        }
        onClose();
      }}
      onPointerDown={(e) => {
        if (dialogRef.current && !("closedBy" in HTMLDialogElement.prototype)) {
          pressedOutsideRef.current = isOutside(e, dialogRef.current);
        }
      }}
      onPointerUp={(e) => {
        if (
          dialogRef.current &&
          !("closedBy" in HTMLDialogElement.prototype) &&
          pressedOutsideRef.current &&
          isOutside(e, dialogRef.current)
        ) {
          dialogRef.current.close();
        }
      }}
      className="m-auto bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 border border-slate-200 open:animate-in open:fade-in open:zoom-in duration-150"
    >
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 id={titleId} className="font-semibold text-lg text-slate-800">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Fechar modal"
          className="text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
        >
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
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

  // Estado de edição para modais
  const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);

  // Filtros e buscas
  const [profSearch, setProfSearch] = useState("");
  const [subjectClassFilter, setSubjectClassFilter] = useState<string>("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [demandClassFilter, setDemandClassFilter] = useState<string>("");
  const [demandSearch, setDemandSearch] = useState("");
  const [timeslotShiftFilter, setTimeslotShiftFilter] = useState<string>("");
  const [timeslotDayFilter, setTimeslotDayFilter] = useState<string>("");

  // Toast feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const [selectedClassGroupId, setSelectedClassGroupId] = useState<number | null>(
    data.classGroups[0]?.id ?? null
  );
  const [selectedProfessorId, setSelectedProfessorId] = useState<number | null>(
    data.professors[0]?.id ?? null
  );

  const [isPending, startTransition] = useTransition();
  const [solverModalOpen, setSolverModalOpen] = useState(false);
  const [solverProgress, setSolverProgress] = useState(0);
  const [solverStatus, setSolverStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [solverMessage, setSolverMessage] = useState("");
  const [prefSelectedProfessorId, setPrefSelectedProfessorId] = useState<number | null>(null);

  // Estado dinâmico da grade por turma
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>(data.initialGrade);
  const [gradeLoading, setGradeLoading] = useState(false);

  // Estado dinâmico da grade por professor
  const [profGradeEntries, setProfGradeEntries] = useState<ProfessorGradeEntry[]>([]);
  const [profGradeLoading, setProfGradeLoading] = useState(false);

  // Estado para todas as grades
  const [allGradesData, setAllGradesData] = useState<Record<string, ClassGradeData>>({});
  const [allGradesLoading, setAllGradesLoading] = useState(false);

  // Refs para os formulários
  const professorFormRef = useRef<HTMLFormElement>(null);
  const classFormRef = useRef<HTMLFormElement>(null);
  const subjectFormRef = useRef<HTMLFormElement>(null);
  const demandFormRef = useRef<HTMLFormElement>(null);
  const timeslotFormRef = useRef<HTMLFormElement>(null);

  // Sincronizar seleção inicial quando listas mudam
  useEffect(() => {
    if (
      data.classGroups.length > 0 &&
      (!selectedClassGroupId || !data.classGroups.some((cg) => cg.id === selectedClassGroupId))
    ) {
      setSelectedClassGroupId(data.classGroups[0].id);
    } else if (data.classGroups.length === 0) {
      setSelectedClassGroupId(null);
    }
  }, [data.classGroups, selectedClassGroupId]);

  useEffect(() => {
    if (
      data.professors.length > 0 &&
      (!selectedProfessorId || !data.professors.some((p) => p.id === selectedProfessorId))
    ) {
      setSelectedProfessorId(data.professors[0].id);
    } else if (data.professors.length === 0) {
      setSelectedProfessorId(null);
    }
  }, [data.professors, selectedProfessorId]);

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

  useEffect(() => {
    loadGrade(selectedClassGroupId);
  }, [selectedClassGroupId, loadGrade]);

  // Função para buscar a grade de um professor
  const loadProfGrade = useCallback(async (professorId: number | null) => {
    if (!professorId) {
      setProfGradeEntries([]);
      return;
    }
    setProfGradeLoading(true);
    try {
      const entries = await Actions.fetchGradeForProfessor(professorId);
      setProfGradeEntries(entries);
    } catch {
      setProfGradeEntries([]);
    } finally {
      setProfGradeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profGrade") {
      loadProfGrade(selectedProfessorId);
    }
  }, [activeTab, selectedProfessorId, loadProfGrade]);

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
    setEditingProfessor(null);
    setEditingClassGroup(null);
    setEditingDemand(null);
    setPrefSelectedProfessorId(null);
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
          const inputs = form.querySelectorAll<HTMLInputElement>("input[type='checkbox']");
          inputs.forEach((input) => {
            input.checked = false;
          });
        }
      });
    }, 100);
  };

  const handleFormSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<void>,
    successMsg = "Salvo com sucesso!"
  ) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(() => {
      void action(formData)
        .then(() => {
          closeModal();
          showToast("success", successMsg);
          router.refresh();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          showToast("error", message);
        });
    });
  };

  const handleDeleteAction = (
    action: (formData: FormData) => Promise<void>,
    fieldName: string,
    id: number,
    successMsg = "Registro removido."
  ) => {
    const formData = new FormData();
    formData.set(fieldName, String(id));
    startTransition(() => {
      void action(formData)
        .then(() => {
          showToast("success", successMsg);
          router.refresh();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Erro ao remover";
          showToast("error", message);
        });
    });
  };

  const handleGenerateDefaultTimeslots = () => {
    startTransition(() => {
      void Actions.createDefaultTimeslots()
        .then((res) => {
          showToast(
            "success",
            `Grade padrão gerada! ${res.created} novos horários criados (${res.total} total).`
          );
          router.refresh();
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Erro ao gerar horários";
          showToast("error", message);
        });
    });
  };

  const handleRunSolver = async () => {
    setSolverModalOpen(true);
    setSolverStatus("running");
    setSolverProgress(5);
    setSolverMessage("Validando dados...");

    try {
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

            await loadGrade(selectedClassGroupId);
            await loadProfGrade(selectedProfessorId);
            router.refresh();
          } else if (statusData.status === "ERROR") {
            clearInterval(intervalId);
            setSolverStatus("error");
            setSolverMessage(statusData.details ?? "Ocorreu um erro interno no algoritmo.");
          } else {
            setSolverProgress((prev) => Math.min(prev + 5, 90));
          }
        } catch {
          // continua tentando no próximo ciclo
        }
      }, 1000);
    } catch (error: unknown) {
      setSolverStatus("error");
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      setSolverMessage(`Erro de conexão: ${message}`);
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
      const head = clonedRoot.ownerDocument?.head;
      if (head) {
        head.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => node.remove());
      }

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
      console.warn("copyComputedStylesToClone falhou:", err);
    }
  };

  const exportElementToPDF = async (elementId: string, filename: string, title: string) => {
    const targetEl = document.getElementById(elementId);
    if (!targetEl) {
      showToast("error", "Tabela não encontrada para exportação.");
      return;
    }

    try {
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          try {
            const cloned = clonedDoc.getElementById(elementId);
            if (cloned) copyComputedStylesToClone(targetEl, cloned);
          } catch {
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

      const imgWidth = 277;
      const pageHeight = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFontSize(14);
      pdf.text(title, 10, 8);

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 10, 12, imgWidth, imgHeight);
      } else {
        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 10, 12 - yOffset, imgWidth, imgHeight);
          yOffset += pageHeight;
        }
      }

      pdf.save(filename);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      showToast("error", "Erro ao exportar PDF.");
    }
  };

  const normalizeTime = (time: string) => {
    if (!time) return "";
    return time.split(":").slice(0, 2).join(":");
  };

  // Calcular shift type selecionado
  const selectedClassGroup = data.classGroups.find(
    (g) => g.id === selectedClassGroupId
  );
  const shiftType = selectedClassGroup?.shiftType ?? "REGULAR";

  const timeslotsForShift = data.timeslots
    .filter((slot) => slot.shiftType === shiftType)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const timeRows = Array.from(
    new Map(
      timeslotsForShift.map((slot) => {
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

  // Todos os horários únicos (para a grade por professor, que pode lecionar em Regular e Integral)
  const allUniqueTimeRows = Array.from(
    new Map(
      [...data.timeslots]
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((slot) => {
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

  const gradeMap = new Map<string, GradeEntry>();
  gradeEntries.forEach((entry) => {
    const key = `${entry.dayOfWeek}-${normalizeTime(entry.startTime)}-${normalizeTime(entry.endTime)}`;
    gradeMap.set(key, entry);
  });

  const profGradeMap = new Map<string, ProfessorGradeEntry>();
  profGradeEntries.forEach((entry) => {
    const key = `${entry.dayOfWeek}-${normalizeTime(entry.startTime)}-${normalizeTime(entry.endTime)}`;
    profGradeMap.set(key, entry);
  });

  // Estatísticas auxiliares
  const totalDemandedLessons = data.demands.reduce((acc, d) => acc + d.quantityPerWeek, 0);
  const allocatedCount = data.summary.scheduleEntries ?? 0;
  const allocationRate =
    totalDemandedLessons > 0
      ? Math.min(100, Math.round((allocatedCount / totalDemandedLessons) * 100))
      : 0;

  // Carga horária por professor
  const workloadByProfessor = new Map<number, number>();
  data.demands.forEach((d) => {
    d.professors.forEach((p) => {
      workloadByProfessor.set(p.id, (workloadByProfessor.get(p.id) ?? 0) + d.quantityPerWeek);
    });
  });

  // Listas filtradas
  const filteredProfessors = data.professors.filter((p) =>
    p.name.toLowerCase().includes(profSearch.toLowerCase())
  );

  const filteredSubjects = data.subjects.filter((s) => {
    const matchesClass = !subjectClassFilter || String(s.classGroup?.id) === subjectClassFilter;
    const matchesSearch =
      !subjectSearch ||
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      s.classGroup?.name.toLowerCase().includes(subjectSearch.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const filteredDemands = data.demands.filter((d) => {
    const matchesClass = !demandClassFilter || String(d.subject?.classGroup?.id) === demandClassFilter;
    const matchesSearch =
      !demandSearch ||
      d.subject?.name.toLowerCase().includes(demandSearch.toLowerCase()) ||
      d.professors.some((p) => p.name.toLowerCase().includes(demandSearch.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  const filteredTimeslots = data.timeslots.filter((t) => {
    const matchesShift = !timeslotShiftFilter || t.shiftType === timeslotShiftFilter;
    const matchesDay = !timeslotDayFilter || String(t.dayOfWeek) === timeslotDayFilter;
    return matchesShift && matchesDay;
  });

  const navItems = [
    { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { id: "professors", label: "Professores", icon: Users },
    { id: "classes", label: "Turmas", icon: GraduationCap },
    { id: "subjects", label: "Matérias", icon: BookOpen },
    { id: "demands", label: "Demandas", icon: AlertCircle },
    { id: "timeslots", label: "Horários", icon: Clock },
    { id: "restrictions", label: "Restrições", icon: ShieldAlert },
    { id: "preferences", label: "Preferências", icon: Star },
    { id: "grade", label: "Grade por Turma", icon: Calendar },
    { id: "profGrade", label: "Grade por Professor", icon: UserCheck },
    { id: "allGrades", label: "Todas as Grades", icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* MOBILE TOP NAVIGATION BAR */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EtecFlow
            </h1>
            <p className="text-[11px] text-slate-400">Timetabling Solver</p>
          </div>
          <button
            type="button"
            onClick={handleRunSolver}
            disabled={isPending}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700"
          >
            Rodar Solver
          </button>
        </div>
        <nav aria-label="Navegação Mobile" className="flex overflow-x-auto px-2 py-2 gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            EtecFlow
          </h1>
          <p className="text-xs text-slate-400 mt-1">Timetabling Solver</p>
        </div>
        <nav aria-label="Navegação Principal" className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
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
      <main className="flex-1 md:ml-64 p-4 sm:p-8 max-w-full overflow-x-hidden">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
                <p className="text-sm text-slate-500">
                  Painel de controle e diagnóstico da grade horária escolar ETEC
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {data.timeslots.length === 0 && (
                  <ActionButton
                    onClick={handleGenerateDefaultTimeslots}
                    label="Gerar 70 Horários Padrão ETEC"
                    icon={Sparkles}
                    variant="secondary"
                    disabled={isPending}
                  />
                )}
                {allocatedCount > 0 && (
                  <ActionButton
                    onClick={() => {
                      startTransition(() => {
                        void Actions.clearGrades().then(() => {
                          showToast("success", "Grades alocadas foram limpas.");
                          setGradeEntries([]);
                          setProfGradeEntries([]);
                          router.refresh();
                        });
                      });
                    }}
                    label="Limpar Grade"
                    icon={RotateCcw}
                    variant="danger"
                    disabled={isPending}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                title="Professores"
                value={data.summary.professors}
                subtitle={`${data.unavailability.length} restrições • ${data.preferences.length} preferências`}
                icon={Users}
                color="bg-blue-500"
              />
              <Card
                title="Turmas"
                value={data.summary.classGroups}
                subtitle={`${data.classGroups.filter((c) => c.shiftType === "INTEGRAL").length} Integral • ${data.classGroups.filter((c) => c.shiftType === "REGULAR").length} Regular`}
                icon={GraduationCap}
                color="bg-emerald-500"
              />
              <Card
                title="Matérias & Demandas"
                value={`${data.summary.subjects} / ${data.demands.length}`}
                subtitle={`${totalDemandedLessons} aulas semanais exigidas`}
                icon={BookOpen}
                color="bg-violet-500"
              />
              <Card
                title="Horários (Tabuleiro)"
                value={data.summary.timeslots}
                subtitle="Slots semanais cadastrados"
                icon={Clock}
                color="bg-indigo-500"
              />
              <Card
                title="Aulas Alocadas"
                value={`${allocatedCount} / ${totalDemandedLessons}`}
                subtitle={`Taxa de alocação: ${allocationRate}%`}
                icon={Calendar}
                color="bg-orange-500"
              />
              <Card
                title="Restrições & Preferências"
                value={data.unavailability.length + data.preferences.length}
                subtitle={`${data.unavailability.length} bloqueios • ${data.preferences.length} desejos`}
                icon={Star}
                color="bg-amber-500"
              />
            </div>

            <div className="bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Motor de Otimização (Solver)</h3>
                <p className="text-slate-300 max-w-xl text-sm">
                  O solver executa múltiplas tentativas com heurística MRV, aulas duplas geminadas,
                  interleaving entre turmas, backtracking e fase de reparo respeitando restrições e preferências.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunSolver}
                disabled={isPending}
                className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
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

            {/* RESUMO DE OCUPAÇÃO POR TURMA */}
            {data.classGroups.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Ocupação de Demandas por Turma</h3>
                  <span className="text-xs text-slate-500">
                    Capacidade: Integral (40 slots) • Regular (30 slots)
                  </span>
                </div>
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Ocupação de Demandas por Turma"
                  className="table-wrapper"
                >
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Turma
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Turno
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Matérias / Demandas
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                          Aulas Semanais
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                          Ver Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.classGroups.map((cg) => {
                        const cgDemands = data.demands.filter(
                          (d) => d.subject?.classGroup?.id === cg.id
                        );
                        const cgLessons = cgDemands.reduce((acc, d) => acc + d.quantityPerWeek, 0);
                        const maxSlots = data.timeslots.filter(
                          (t) => t.shiftType === cg.shiftType
                        ).length || (cg.shiftType === "INTEGRAL" ? 40 : 30);
                        const pct = maxSlots > 0 ? Math.min(100, Math.round((cgLessons / maxSlots) * 100)) : 0;

                        return (
                          <tr key={cg.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-semibold text-slate-800">{cg.name}</td>
                            <td className="px-6 py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  cg.shiftType === "INTEGRAL"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {cg.shiftType}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-600">
                              {cgDemands.length} demandas
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-2 rounded-full ${
                                      cgLessons > maxSlots
                                        ? "bg-red-500"
                                        : pct >= 85
                                        ? "bg-emerald-500"
                                        : "bg-blue-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-slate-600">
                                  {cgLessons}/{maxSlots} ({pct}%)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClassGroupId(cg.id);
                                  setActiveTab("grade");
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Abrir Grade →
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFESSORS TAB */}
        {activeTab === "professors" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Gerenciar Professores
                </h2>
                <p className="text-sm text-slate-500">
                  {data.professors.length} professores cadastrados
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={profSearch}
                    onChange={(e) => setProfSearch(e.target.value)}
                    placeholder="Buscar professor..."
                    aria-label="Buscar professor"
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <ActionButton
                  onClick={() => {
                    setEditingProfessor(null);
                    openModal("createProfessor");
                  }}
                  label="Novo Professor"
                  icon={Plus}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Professores"
                className="table-wrapper"
              >
                <table className="w-full">
                  <TableHeader cols={["ID", "Nome", "Carga Semanal", "Indisponibilidades"]} />
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfessors.map((prof) => {
                      const load = workloadByProfessor.get(prof.id) ?? 0;
                      const unavailCount = data.unavailability.filter(
                        (u) => u.professorId === prof.id
                      ).length;
                      return (
                        <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">
                            #{prof.id}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            {prof.name}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                              {load} aulas/sem
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {unavailCount} registros
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProfessorId(prof.id);
                                  setActiveTab("profGrade");
                                }}
                                title="Ver grade do professor"
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                Grade
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProfessor(prof);
                                  openModal("editProfessor");
                                }}
                                aria-label={`Editar ${prof.name}`}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAction(
                                    Actions.deleteProfessor,
                                    "professorId",
                                    prof.id,
                                    `Professor ${prof.name} removido.`
                                  )
                                }
                                aria-label={`Remover ${prof.name}`}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredProfessors.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum professor encontrado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* CLASSES TAB */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Turmas & Turnos</h2>
                <p className="text-sm text-slate-500">
                  Turmas do ensino Regular (Manhã) e Integral (M-Tec)
                </p>
              </div>
              <ActionButton
                onClick={() => {
                  setEditingClassGroup(null);
                  openModal("createClass");
                }}
                label="Nova Turma"
                icon={Plus}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Turmas"
                className="table-wrapper"
              >
                <table className="w-full">
                  <TableHeader cols={["Nome", "Modelo/Turno", "Matérias"]} />
                  <tbody className="divide-y divide-slate-100">
                    {data.classGroups.map((group) => {
                      const subjCount = data.subjects.filter(
                        (s) => s.classGroup?.id === group.id
                      ).length;
                      return (
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
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {subjCount} matérias
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClassGroup(group);
                                  openModal("editClass");
                                }}
                                aria-label={`Editar turma ${group.name}`}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAction(
                                    Actions.deleteClassGroup,
                                    "classGroupId",
                                    group.id,
                                    `Turma ${group.name} removida.`
                                  )
                                }
                                aria-label={`Remover turma ${group.name}`}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Gerenciar Matérias
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredSubjects.length} de {data.subjects.length} matérias exibidas
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={subjectClassFilter}
                  onChange={(e) => setSubjectClassFilter(e.target.value)}
                  aria-label="Filtrar matérias por turma"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todas as turmas</option>
                  {data.classGroups.map((cg) => (
                    <option key={cg.id} value={String(cg.id)}>
                      {cg.name}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Buscar matéria..."
                    aria-label="Buscar matéria"
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <ActionButton
                  onClick={() => openModal("createSubject")}
                  label="Nova Matéria"
                  icon={Plus}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Matérias"
                className="table-wrapper"
              >
                <table className="w-full">
                  <TableHeader cols={["Nome", "Turma"]} />
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubjects.map((subject) => (
                      <tr key={subject.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">{subject.name}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {subject.classGroup?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAction(
                                Actions.deleteSubject,
                                "subjectId",
                                subject.id,
                                `Matéria ${subject.name} removida.`
                              )
                            }
                            aria-label={`Remover matéria ${subject.name}`}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredSubjects.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma matéria encontrada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* DEMANDS TAB */}
        {activeTab === "demands" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Demandas e Co-Teaching
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredDemands.length} demandas ({filteredDemands.reduce((a, b) => a + b.quantityPerWeek, 0)} aulas/semana)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={demandClassFilter}
                  onChange={(e) => setDemandClassFilter(e.target.value)}
                  aria-label="Filtrar demandas por turma"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todas as turmas</option>
                  {data.classGroups.map((cg) => (
                    <option key={cg.id} value={String(cg.id)}>
                      {cg.name}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={demandSearch}
                    onChange={(e) => setDemandSearch(e.target.value)}
                    placeholder="Matéria ou professor..."
                    aria-label="Buscar demanda por matéria ou professor"
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <ActionButton
                  onClick={() => {
                    setEditingDemand(null);
                    openModal("createDemand");
                  }}
                  label="Nova Demanda"
                  icon={Plus}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Demandas"
                className="table-wrapper"
              >
                <table className="w-full">
                  <TableHeader cols={["Matéria", "Turma", "Qtd", "Aula Dupla", "Professores"]} />
                  <tbody className="divide-y divide-slate-100">
                    {filteredDemands.map((demand) => (
                      <tr key={demand.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">
                          {demand.subject?.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                            {demand.subject?.classGroup?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {demand.quantityPerWeek}x
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {demand.allowDoubleLesson ? "Sim" : "Não"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {demand.professors.map((p) => p.name).join(", ")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDemand(demand);
                                openModal("editDemand");
                              }}
                              aria-label={`Editar demanda de ${demand.subject?.name}`}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAction(
                                  Actions.deleteDemand,
                                  "demandId",
                                  demand.id,
                                  "Demanda removida."
                                )
                              }
                              aria-label={`Remover demanda de ${demand.subject?.name}`}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredDemands.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma demanda encontrada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TIMESLOTS TAB */}
        {activeTab === "timeslots" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Horários por Turno
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredTimeslots.length} de {data.timeslots.length} horários exibidos
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={timeslotShiftFilter}
                  onChange={(e) => setTimeslotShiftFilter(e.target.value)}
                  aria-label="Filtrar por turno"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todos os turnos</option>
                  <option value="REGULAR">Regular</option>
                  <option value="INTEGRAL">Integral</option>
                </select>
                <select
                  value={timeslotDayFilter}
                  onChange={(e) => setTimeslotDayFilter(e.target.value)}
                  aria-label="Filtrar por dia da semana"
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Todos os dias</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                </select>
                <ActionButton
                  onClick={handleGenerateDefaultTimeslots}
                  label="Gerar Grade Padrão ETEC"
                  icon={Sparkles}
                  variant="secondary"
                  disabled={isPending}
                />
                <ActionButton
                  onClick={() => openModal("createTimeslot")}
                  label="Novo Horário"
                  icon={Plus}
                />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Horários"
                className="table-wrapper"
              >
                <table className="w-full">
                  <TableHeader cols={["Dia", "Início", "Fim", "Turno"]} />
                  <tbody className="divide-y divide-slate-100">
                    {filteredTimeslots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">
                          {dayLabels[slot.dayOfWeek] ?? slot.dayOfWeek}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {normalizeTime(slot.startTime)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {normalizeTime(slot.endTime)}
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
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteAction(
                                Actions.deleteTimeslot,
                                "timeslotId",
                                slot.id,
                                "Horário removido."
                              )
                            }
                            aria-label="Remover horário"
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTimeslots.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum horário cadastrado. Clique em &ldquo;Gerar Grade Padrão ETEC&rdquo; para criar os 70 horários automaticamente.
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
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Restrições"
                className="table-wrapper"
              >
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
                        const profName =
                          u.professorName ??
                          data.professors.find((p) => p.id === u.professorId)?.name ??
                          `Prof #${u.professorId}`;
                        const dayName =
                          u.dayOfWeek === 0
                            ? "Todos os dias"
                            : dayLabels[u.dayOfWeek] ?? `Dia ${u.dayOfWeek}`;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-800">
                              {profName}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  u.dayOfWeek === 0
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
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
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAction(
                                    Actions.deleteUnavailability,
                                    "unavailabilityId",
                                    u.id,
                                    "Restrição removida."
                                  )
                                }
                                aria-label="Remover restrição"
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Preferências"
                className="table-wrapper"
              >
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
                        const profName =
                          pref.professorName ??
                          data.professors.find((p) => p.id === pref.professorId)?.name ??
                          `Prof #${pref.professorId}`;
                        const subjName =
                          pref.subjectName ??
                          (pref.subjectId
                            ? data.subjects.find((s) => s.id === pref.subjectId)?.name ??
                              `Matéria #${pref.subjectId}`
                            : "Qualquer");
                        const dayName =
                          pref.dayOfWeek === 0
                            ? "Qualquer dia"
                            : dayLabels[pref.dayOfWeek] ?? `Dia ${pref.dayOfWeek}`;
                        const timeStr =
                          pref.startTime && pref.endTime
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
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                  pref.weight >= 8
                                    ? "bg-orange-100 text-orange-800"
                                    : pref.weight >= 5
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {pref.weight}/10
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  pref.type === "PREFERRED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {pref.type === "PREFERRED" ? "Preferido" : "Evitar"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteAction(
                                    Actions.deletePreference,
                                    "preferenceId",
                                    pref.id,
                                    "Preferência removida."
                                  )
                                }
                                aria-label="Remover preferência"
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* GRADE POR TURMA TAB */}
        {activeTab === "grade" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Grade Horária — {selectedClassGroup?.name ?? "Turma"}
                </h2>
                <p className="text-xs text-slate-500">
                  Turno {shiftType} • {gradeEntries.length} aulas alocadas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    exportElementToPDF(
                      "grade-table",
                      `grade-${selectedClassGroup?.name ?? "turma"}.pdf`,
                      `Grade Horária - ${selectedClassGroup?.name ?? "EtecFlow"}`
                    )
                  }
                  disabled={gradeLoading || gradeEntries.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <select
                  value={selectedClassGroupId ?? ""}
                  onChange={(e) => setSelectedClassGroupId(Number(e.target.value))}
                  aria-label="Selecionar turma"
                  className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {data.classGroups.map((cg) => (
                    <option key={cg.id} value={cg.id}>
                      {cg.name} ({cg.shiftType})
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Horário
                      </th>
                      {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
                        <th
                          key={day}
                          scope="col"
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

        {/* GRADE POR PROFESSOR TAB */}
        {activeTab === "profGrade" && (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Agenda do Professor
                </h2>
                <p className="text-xs text-slate-500">
                  {profGradeEntries.length} aulas alocadas na semana
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const profName =
                      data.professors.find((p) => p.id === selectedProfessorId)?.name ?? "professor";
                    exportElementToPDF(
                      "prof-grade-table",
                      `agenda-${profName}.pdf`,
                      `Agenda do Professor - ${profName}`
                    );
                  }}
                  disabled={profGradeLoading || profGradeEntries.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <select
                  value={selectedProfessorId ?? ""}
                  onChange={(e) => setSelectedProfessorId(Number(e.target.value))}
                  aria-label="Selecionar professor"
                  className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {data.professors.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} ({workloadByProfessor.get(prof.id) ?? 0} aulas)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {data.professors.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre professores primeiro para visualizar a agenda.
              </div>
            ) : profGradeLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader className="animate-spin" size={20} />
                Carregando agenda do professor...
              </div>
            ) : allUniqueTimeRows.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Cadastre horários para visualizar a agenda.
              </div>
            ) : profGradeEntries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Nenhuma aula alocada para este professor. Rode o solver primeiro.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full" id="prof-grade-table">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Horário
                      </th>
                      {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
                        <th
                          key={day}
                          scope="col"
                          className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allUniqueTimeRows.map((row, rowIdx) => (
                      <tr key={`${row.startTime}-${row.endTime}`}>
                        <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                          {row.startTime} - {row.endTime}
                        </td>
                        {[1, 2, 3, 4, 5].map((dayOfWeek) => {
                          const key = `${dayOfWeek}-${row.startTime}-${row.endTime}`;
                          const entry = profGradeMap.get(key);

                          return (
                            <td
                              key={`${rowIdx}-${dayOfWeek}`}
                              className="px-6 py-4 text-center border-l border-slate-100"
                            >
                              {entry ? (
                                <div className="space-y-1 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                  <span className="inline-block px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">
                                    Turma {entry.classGroup} ({entry.shiftType})
                                  </span>
                                  <p className="text-xs font-bold text-indigo-900">
                                    {entry.subject}
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
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">Todas as Grades</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    exportElementToPDF(
                      "all-grades-container",
                      "todas-as-grades.pdf",
                      "Todas as Grades - EtecFlow"
                    )
                  }
                  disabled={allGradesLoading || Object.keys(allGradesData).length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} /> Exportar PDF
                </button>
                <button
                  type="button"
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

                  const cellColors: Record<
                    string,
                    { bg: string; border: string; text: string; subText: string }
                  > = {
                    INTEGRAL: {
                      bg: "bg-indigo-50",
                      border: "border-indigo-100",
                      text: "text-indigo-800",
                      subText: "text-indigo-600",
                    },
                    REGULAR: {
                      bg: "bg-emerald-50",
                      border: "border-emerald-100",
                      text: "text-emerald-800",
                      subText: "text-emerald-600",
                    },
                  };

                  const colors = cellColors[classShift] ?? cellColors.REGULAR;

                  return (
                    <div
                      key={classData.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                    >
                      <div
                        className={`bg-linear-to-r ${
                          shiftColors[classShift] ?? shiftColors.REGULAR
                        } px-6 py-3 flex items-center justify-between`}
                      >
                        <h3 className="text-lg font-bold text-white">{className}</h3>
                        <span className="text-xs font-medium text-white/80 bg-white/20 px-3 py-1 rounded-full">
                          {classShift === "INTEGRAL" ? "Integral" : "Regular"} •{" "}
                          {classData.entries.length} aulas
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
                                <th scope="col" className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
                                  Horário
                                </th>
                                {["Segunda", "Terça", "Quarta", "Quinta", "Sexta"].map((day) => (
                                  <th
                                    key={day}
                                    scope="col"
                                    className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"
                                  >
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
                                      <td
                                        key={dayOfWeek}
                                        className="px-4 py-3 text-center border-l border-slate-100"
                                      >
                                        {entry ? (
                                          <div
                                            className={`space-y-0.5 ${colors.bg} p-2 rounded-lg border ${colors.border}`}
                                          >
                                            <p className={`text-xs font-bold ${colors.text}`}>
                                              {entry.subject}
                                            </p>
                                            <p
                                              className={`text-[10px] ${colors.subText} font-medium`}
                                            >
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
          onSubmit={(e) => handleFormSubmit(e, Actions.createProfessor, "Professor cadastrado!")}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome Completo
            </label>
            <input
              name="name"
              autoFocus
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
        isOpen={isModalOpen && modalType === "editProfessor" && editingProfessor !== null}
        onClose={closeModal}
        title="Editar Professor"
      >
        {editingProfessor && (
          <form
            onSubmit={(e) => handleFormSubmit(e, Actions.updateProfessor, "Professor atualizado!")}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="professorId" value={editingProfessor.id} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome Completo
              </label>
              <input
                name="name"
                defaultValue={editingProfessor.name}
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Atualizando..." : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createClass"}
        onClose={closeModal}
        title="Nova Turma"
      >
        <form
          ref={classFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createClassGroup, "Turma criada!")}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da Turma
            </label>
            <input
              name="name"
              autoFocus
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
        isOpen={isModalOpen && modalType === "editClass" && editingClassGroup !== null}
        onClose={closeModal}
        title="Editar Turma"
      >
        {editingClassGroup && (
          <form
            onSubmit={(e) => handleFormSubmit(e, Actions.updateClassGroup, "Turma atualizada!")}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="classGroupId" value={editingClassGroup.id} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Turma
              </label>
              <input
                name="name"
                defaultValue={editingClassGroup.name}
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Modelo
              </label>
              <select
                name="shiftType"
                defaultValue={editingClassGroup.shiftType}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="REGULAR">Regular (Manhã/Tarde)</option>
                <option value="INTEGRAL">Integral (M-Tec/AMS)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Atualizando..." : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createSubject"}
        onClose={closeModal}
        title="Nova Matéria"
      >
        <form
          ref={subjectFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createSubject, "Matéria cadastrada!")}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da Matéria
            </label>
            <input
              name="name"
              autoFocus
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
          onSubmit={(e) => handleFormSubmit(e, Actions.createDemand, "Demanda criada!")}
          className="flex flex-col gap-4"
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
              Quantidade de Aulas Semanais
            </label>
            <input
              name="quantityPerWeek"
              type="number"
              min={1}
              defaultValue={2}
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
            <input type="checkbox" name="allowDoubleLesson" defaultChecked />
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
        isOpen={isModalOpen && modalType === "editDemand" && editingDemand !== null}
        onClose={closeModal}
        title="Editar Demanda"
      >
        {editingDemand && (
          <form
            onSubmit={(e) => handleFormSubmit(e, Actions.updateDemand, "Demanda atualizada!")}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="demandId" value={editingDemand.id} />
            <input type="hidden" name="subjectId" value={editingDemand.subject.id} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Matéria / Turma
              </label>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                {editingDemand.subject.name} — {editingDemand.subject.classGroup?.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantidade de Aulas Semanais
              </label>
              <input
                name="quantityPerWeek"
                type="number"
                min={1}
                defaultValue={editingDemand.quantityPerWeek}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Professores (Co-Teaching)
              </label>
              <div className="space-y-2 border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                {data.professors.map((prof) => (
                  <label key={prof.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="professorIds"
                      value={prof.id}
                      defaultChecked={editingDemand.professors.some((p) => p.id === prof.id)}
                    />
                    <span className="text-sm">{prof.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowDoubleLesson"
                defaultChecked={editingDemand.allowDoubleLesson}
              />
              Permite aula dupla (geminada)
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Atualizando..." : "Salvar Alterações"}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen && modalType === "createTimeslot"}
        onClose={closeModal}
        title="Novo Horário"
      >
        <form
          ref={timeslotFormRef}
          onSubmit={(e) => handleFormSubmit(e, Actions.createTimeslot, "Horário cadastrado!")}
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
          onSubmit={(e) => handleFormSubmit(e, Actions.createUnavailability, "Restrição criada!")}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professor</label>
            <select
              name="professorId"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                const v = Number(e.target.value) || null;
                setPrefSelectedProfessorId(v);
              }}
            >
              <option value="">Selecione...</option>
              {data.professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
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
          onSubmit={(e) => handleFormSubmit(e, Actions.createPreference, "Preferência criada!")}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professor *</label>
            <select
              name="professorId"
              required
              onChange={(e) => {
                const v = Number(e.target.value) || null;
                setPrefSelectedProfessorId(v);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione...</option>
              {data.professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Matéria (opcional)</label>
            <select
              name="subjectId"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!prefSelectedProfessorId}
            >
              <option value="">Qualquer matéria</option>
              {!prefSelectedProfessorId ? (
                <option value="" disabled>
                  Selecione um professor primeiro
                </option>
              ) : (
                (() => {
                  const filtered = data.subjects.filter((s) =>
                    data.demands.some(
                      (d) =>
                        d.subject?.id === s.id &&
                        d.professors.some((p) => p.id === prefSelectedProfessorId)
                    )
                  );
                  if (filtered.length === 0) {
                    return (
                      <option value="" disabled>
                        Nenhuma matéria encontrada para este professor
                      </option>
                    );
                  }
                  return filtered.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.classGroup?.name}
                    </option>
                  ));
                })()
              )}
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
      <Modal
        isOpen={solverModalOpen}
        onClose={() => {
          if (solverStatus !== "running") {
            setSolverModalOpen(false);
          }
        }}
        title={
          solverStatus === "running"
            ? "⏳ Gerando Grade..."
            : solverStatus === "success"
            ? "✅ Grade Gerada com Sucesso!"
            : "❌ Erro no Solver"
        }
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            {solverStatus === "running" && (
              <Loader className="animate-spin text-blue-600" size={40} />
            )}
            {solverStatus === "success" && (
              <div className="text-green-500">
                <CheckCircle2 size={56} />
              </div>
            )}
            {solverStatus === "error" && (
              <AlertCircle className="text-red-500" size={40} />
            )}
          </div>

          <div className="space-y-2">
            <div className="text-slate-700 text-xs sm:text-sm font-medium whitespace-pre-line max-h-60 overflow-y-auto bg-slate-50 p-3 rounded-lg border border-slate-100">
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
              type="button"
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
      </Modal>
    </div>
  );
}
