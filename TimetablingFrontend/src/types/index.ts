export type SummaryResponse = {
  timeslots: number;
  professors: number;
  classGroups: number;
  subjects: number;
  lessons: number;
  demands?: number;
  scheduleEntries?: number;
  unavailabilities?: number;
  preferences?: number;
};

export type Professor = {
  id: number;
  name: string;
};

export type ClassGroup = {
  id: number;
  name: string;
  shiftType: "REGULAR" | "INTEGRAL";
};

export type Subject = {
  id: number;
  name: string;
  classGroup: ClassGroup;
};

export type Timeslot = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  shiftType: "REGULAR" | "INTEGRAL";
};

export type Unavailability = {
  id: number;
  professorId: number;
  professorName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type Demand = {
  id: number;
  subject: Subject;
  quantityPerWeek: number;
  allowDoubleLesson: boolean;
  professors: Professor[];
};

export type GradeEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  professors: string[];
};

export type ClassGradeData = {
  id: number;
  name: string;
  shiftType: string;
  entries: GradeEntry[];
};

export type ProfessorGradeEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  classGroup: string;
  shiftType: string;
  professors: string[];
};

export type ProfessorGradeData = {
  id: number;
  name: string;
  entries: ProfessorGradeEntry[];
};

export type ProfessorPreference = {
  id: number;
  professorId: number;
  professorName: string;
  subjectId: number | null;
  subjectName: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  weight: number;
  type: "PREFERRED" | "AVOID";
};
