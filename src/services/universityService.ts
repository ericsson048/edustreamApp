import { apiClient } from './apiClient';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type JustificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UniversitySession {
  id: string;
  course: string;
  course_title?: string;
  title: string;
  session_type: 'CM' | 'TD' | 'TP';
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  is_cancelled: boolean;
  created_by: string;
  student_count?: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session: string;
  student: string;
  student_name?: string;
  course_id?: string;
  course_title?: string;
  session_title?: string;
  session_date?: string;
  session_type?: string;
  status: AttendanceStatus;
  justification: string;
  justification_status: JustificationStatus;
  justification_submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  can_justify?: boolean;
  session_end?: string;
  updated_at: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  pending_justifications: number;
}

export interface Evaluation {
  id: string;
  course: string;
  course_title?: string;
  kind: 'CONTINUOUS' | 'EXAM' | 'ORAL';
  kind_display?: string;
  title: string;
  coefficient: string;
  date: string | null;
  assignment: string | null;
  quiz: string | null;
  source?: string | null;
  created_by: string;
  created_at: string;
}

export interface EvaluationGrade {
  id: string;
  evaluation: string;
  evaluation_title?: string;
  evaluation_kind?: string;
  enrollment: string;
  student_name?: string;
  course_id?: string;
  attempt: number;
  note: string | null;
  updated_at: string;
}

export interface StudentGradeRow {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  attendance: AttendanceSummary;
  attendance_rate: number | null;
  session_1: { average: number | null; decision: string; decision_display: string; credits_earned: number };
  session_2: { average: number | null; decision: string; decision_display: string; credits_earned: number };
  evaluations: { id: string; title: string; kind: string; coefficient: number; note: number | null }[];
}

export interface CourseGradesSummary {
  course: { id: string; title: string; credits: number };
  students: StudentGradeRow[];
}

export interface TranscriptRow {
  enrollment_id: string;
  student: { id?: string; full_name: string; email?: string };
  attendance: AttendanceSummary;
  attendance_rate: number | null;
  session_1: { average: number | null; decision: string; decision_display: string };
  session_2: { average: number | null; decision: string; decision_display: string };
  final: { attempt: number; average: number | null; decision: string; decision_display: string };
  credits_earned: number;
  evaluations: { id: string; title: string; kind: string; coefficient: number; attempt: number; note: number | null; has_grade: boolean }[];
}

export interface CourseTranscript {
  course: {
    id: string;
    title: string;
    subtitle: string;
    course_type: string;
    credits: number;
    start_date: string | null;
    end_date: string | null;
    instructor_name: string;
    issued_at: string;
  };
  rows: TranscriptRow[];
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const universityService = {
  async listUniversitySessions(courseId: string): Promise<UniversitySession[]> {
    const { data } = await apiClient.get<Paginated<UniversitySession>>('/university-sessions/', {
      params: { course: courseId },
    });
    return data.results ?? [];
  },

  async createUniversitySession(payload: {
    course: string;
    session_type: 'CM' | 'TD' | 'TP';
    title?: string;
    date: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): Promise<UniversitySession> {
    const { data } = await apiClient.post<UniversitySession>('/university-sessions/', payload);
    return data;
  },

  async deleteUniversitySession(sessionId: string): Promise<void> {
    await apiClient.delete(`/university-sessions/${sessionId}/`);
  },

  async listSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const { data } = await apiClient.get<AttendanceRecord[]>(`/university-sessions/${sessionId}/attendance/`);
    return data;
  },

  async markSessionAttendance(sessionId: string, records: { student_id: string; status: string }[]): Promise<number> {
    const { data } = await apiClient.post<{ updated: number }>(
      `/university-sessions/${sessionId}/attendance/`,
      { records },
    );
    return data.updated;
  },

  async listAttendanceRecords(params?: { session?: string; student?: string }): Promise<AttendanceRecord[]> {
    const { data } = await apiClient.get<Paginated<AttendanceRecord>>('/attendance-records/', { params });
    return data.results ?? [];
  },

  async justifyAbsence(recordId: string, justification: string): Promise<AttendanceRecord> {
    const { data } = await apiClient.post<AttendanceRecord>(`/attendance-records/${recordId}/justify/`, {
      justification,
    });
    return data;
  },

  async reviewJustification(recordId: string, decision: 'APPROVE' | 'REJECT'): Promise<AttendanceRecord> {
    const { data } = await apiClient.post<AttendanceRecord>(`/attendance-records/${recordId}/review/`, { decision });
    return data;
  },

  async listEvaluations(courseId: string): Promise<Evaluation[]> {
    const { data } = await apiClient.get<Paginated<Evaluation>>('/evaluations/', { params: { course: courseId } });
    return data.results ?? [];
  },

  async createEvaluation(payload: {
    course: string;
    kind: 'CONTINUOUS' | 'EXAM' | 'ORAL';
    title: string;
    coefficient: number;
    date?: string | null;
    quiz?: string | null;
    assignment?: string | null;
  }): Promise<Evaluation> {
    const { data } = await apiClient.post<Evaluation>('/evaluations/', payload);
    return data;
  },

  async deleteEvaluation(evaluationId: string): Promise<void> {
    await apiClient.delete(`/evaluations/${evaluationId}/`);
  },

  async listEvaluationGrades(params?: { evaluation?: string; enrollment?: string; attempt?: number }): Promise<EvaluationGrade[]> {
    const { data } = await apiClient.get<Paginated<EvaluationGrade>>('/evaluation-grades/', { params });
    return data.results ?? [];
  },

  async upsertEvaluationGrade(payload: {
    evaluation: string;
    enrollment: string;
    attempt: number;
    note: number | null;
  }): Promise<EvaluationGrade> {
    const { data } = await apiClient.post<EvaluationGrade>('/evaluation-grades/', payload);
    return data;
  },

  async getCourseGradesSummary(courseId: string): Promise<CourseGradesSummary> {
    const { data } = await apiClient.get<CourseGradesSummary>(`/course-grades/${courseId}/`);
    return data;
  },

  async decideCourseGrade(
    courseId: string,
    payload: { enrollment_id: string; attempt: number; decision: string },
  ): Promise<{ enrollment_id: string; student_name: string; attempt: number; decision: string; average: number | null; credits_earned: number }> {
    const { data } = await apiClient.post(`/course-grades/${courseId}/decide/`, payload);
    return data;
  },

  async getCourseTranscript(courseId: string): Promise<CourseTranscript> {
    const { data } = await apiClient.get<CourseTranscript>(`/course-transcript/${courseId}/`);
    return data;
  },
};