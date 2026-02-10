export type SummaryResponse = {
  timeslots: number;
  professors: number;
  classGroups: number;
  subjects: number;
  lessons: number;
  demands?: number;
  scheduleEntries?: number;
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
