export type CalendarEvent = {
  title: string;
  time: string;
};

export type CalendarResponse = {
  version: number;
  events: CalendarEvent[];
};

export function isCalendarResponse(data: any): data is CalendarResponse {
  return typeof data?.version === 'number' && Array.isArray(data?.events);
}

