import type { StudyTemplate } from "@/types";

export const SYSTEM_STUDY_TEMPLATES: StudyTemplate[] = [
  {
    id: "system-quick-focus",
    userId: "system",
    title: "25 minute quick focus",
    description: "Create one focused task for a compact study block.",
    type: "focus",
    config: {
      tasks: [{ title: "Quick focus session", duration: 25 }]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: "system-deep-study",
    userId: "system",
    title: "50 minute deep study",
    description: "A longer single-task study block for hard chapters.",
    type: "focus",
    config: {
      tasks: [{ title: "Deep study block", duration: 50 }]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: "system-daily-revision",
    userId: "system",
    title: "Daily revision routine",
    description: "Adds a revision task, a reminder habit, and a first revision plan.",
    type: "dailyRoutine",
    config: {
      tasks: [{ title: "Daily revision", duration: 30, subject: "Revision" }],
      habits: [{ title: "Revise one topic", description: "Keep one small revision promise today." }],
      revisions: [{ title: "Review today's hardest topic", subject: "Revision" }]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: "system-weekly-balance",
    userId: "system",
    title: "Balanced weekly timetable",
    description: "Creates four calm recurring study blocks across the week.",
    type: "weeklyTimetable",
    config: {
      timetableBlocks: [
        { title: "Concept study", subject: "Main subject", dayOfWeek: 1, startTime: "18:00", endTime: "19:00" },
        { title: "Problem practice", subject: "Practice", dayOfWeek: 3, startTime: "18:00", endTime: "19:00" },
        { title: "Revision block", subject: "Revision", dayOfWeek: 5, startTime: "17:30", endTime: "18:15" },
        { title: "Weekly mock review", subject: "Testing", dayOfWeek: 6, startTime: "10:00", endTime: "11:30" }
      ]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: "system-exam-prep",
    userId: "system",
    title: "Exam preparation day",
    description: "Creates a serious but manageable test-prep plan for one day.",
    type: "examPrep",
    config: {
      tasks: [
        { title: "Revise formulas and key facts", duration: 35, subject: "Exam prep" },
        { title: "Solve timed questions", duration: 50, subject: "Exam prep" },
        { title: "Review mistakes", duration: 25, subject: "Exam prep" }
      ],
      habits: [{ title: "Mistake review", description: "Write down one mistake pattern after practice." }]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  },
  {
    id: "system-weekend-mock",
    userId: "system",
    title: "Weekend mock test routine",
    description: "A weekend structure for taking and reviewing a mock test.",
    type: "examPrep",
    config: {
      tasks: [
        { title: "Take mock test", duration: 90, subject: "Mock test" },
        { title: "Analyze mock test mistakes", duration: 45, subject: "Mock test" }
      ],
      timetableBlocks: [
        {
          title: "Weekend mock test",
          subject: "Mock test",
          dayOfWeek: 0,
          startTime: "09:00",
          endTime: "10:30",
          notes: "Adjust the time if your mock is longer."
        }
      ]
    },
    isSystemTemplate: true,
    createdAt: null,
    updatedAt: null
  }
];
