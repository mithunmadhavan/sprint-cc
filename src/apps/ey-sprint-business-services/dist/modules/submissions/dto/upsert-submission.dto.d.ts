export declare class RosterMemberDto {
    name?: string;
    role?: string;
    ph?: number;
    al?: number;
    other?: number;
    pct?: number;
    notes?: string;
    AvailableDays?: number;
}
export declare class UpsertSubmissionDto {
    Team: string;
    ProjectKey: string;
    SprintNo: string;
    PI?: string;
    SprintStart?: string;
    SprintEnd?: string;
    submittedDate?: string;
    submittedBy?: string;
    submittedRole?: string;
    TeamSize?: number;
    TotalDays?: number;
    SprintOverhead?: number;
    ProductHealth?: number;
    ProductHealthReduction?: number;
    SprintCapacity?: number;
    DevCapacityDays?: number;
    TestCapacityDays?: number;
    DevPercent?: number;
    TestPercent?: number;
    SprintGoal?: number;
    GoalsAchieved?: number;
    Objectives?: string[];
    Objective?: string;
    Notes?: string;
    Roster?: RosterMemberDto[];
}
