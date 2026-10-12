export const MEMBERS = [
  'Jan',
  'Marcel',
  'Ole',
  'Szymon',
  'Paul',
  'Bolivar',
] as const;
export type Member = (typeof MEMBERS)[number];
export type Status = 'idea' | 'shortlisted' | 'chosen';
export type Kind = 'bar' | 'line' | 'scatter';
export type ChartConfig = {
  kind: Kind;
  x: number;
  y: number;
  decimal: 'dot' | 'comma';
  unit: string;
};
export type Idea = {
  id: string;
  owner_id: string;
  member: Member;
  title: string;
  question: string;
  description: string;
  source_url: string;
  tags: string[];
  status: Status;
  created_at: string;
  updated_at: string;
};
export type Vote = {
  idea_id: string;
  user_id: string;
  member: Member;
  created_at: string;
};
export type Comment = {
  id: string;
  idea_id: string;
  owner_id: string;
  member: Member;
  body: string;
  created_at: string;
};
export type Dataset = {
  id: string;
  owner_id: string;
  member: Member;
  idea_id: string | null;
  name: string;
  source_url: string;
  columns: string[];
  rows: string[][];
  chart: ChartConfig;
  findings: string;
  created_at: string;
  updated_at: string;
};
export type Snapshot = {
  ideas: Idea[];
  votes: Vote[];
  comments: Comment[];
  datasets: Dataset[];
};
export const emptySnapshot: Snapshot = {
  ideas: [],
  votes: [],
  comments: [],
  datasets: [],
};
export const STATUS: Record<Status, string> = {
  idea: 'Idee',
  shortlisted: 'Engere Auswahl',
  chosen: 'Ausgewählt',
};
export const COLOR: Record<Member, string> = {
  Jan: '#5d62c5',
  Marcel: '#986335',
  Ole: '#26715b',
  Szymon: '#3059c0',
  Paul: '#a4516d',
  Bolivar: '#367984',
};
