
import config from '../../config';

export type ICalendarEvent = {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  sendUpdates?: boolean;
};

export type ICalendarEventResponse = {
  eventId: string;
  meetLink?: string;
  htmlLink: string;
  status: string;
};

const getOAuth2Client = () => {

  throw new Error('Google Calendar OAuth2 client not configured');
};

export const createCalendarEvent = async (
  eventData: ICalendarEvent
): Promise<ICalendarEventResponse> => {
  try {

    return {
      eventId: `placeholder-${Date.now()}`,
      meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
      htmlLink: 'https://calendar.google.com/placeholder',
      status: 'confirmed',
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  eventId: string,
  eventData: Partial<ICalendarEvent>
): Promise<ICalendarEventResponse> => {
  try {

    return {
      eventId,
      meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
      htmlLink: 'https://calendar.google.com/placeholder',
      status: 'confirmed',
    };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  try {

    console.log(`Calendar event ${eventId} deleted (placeholder)`);
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

export const getCalendarEvent = async (
  eventId: string
): Promise<ICalendarEventResponse> => {
  try {

    return {
      eventId,
      meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
      htmlLink: 'https://calendar.google.com/placeholder',
      status: 'confirmed',
    };
  } catch (error) {
    console.error('Error getting calendar event:', error);
    throw error;
  }
};

export const createSessionCalendarEvent = async (session: {
  subject: string;
  studentEmail: string;
  studentName: string;
  tutorEmail: string;
  tutorName: string;
  startTime: Date;
  endTime: Date;
}): Promise<ICalendarEventResponse> => {
  return createCalendarEvent({
    summary: `${session.subject} Tutoring Session`,
    description: `Tutoring session between ${session.studentName} and ${session.tutorName}.\n\nSubject: ${session.subject}`,
    startTime: session.startTime,
    endTime: session.endTime,
    attendees: [session.studentEmail, session.tutorEmail],
    sendUpdates: true,
  });
};

export const createInterviewCalendarEvent = async (interview: {
  applicantEmail: string;
  applicantName: string;
  adminEmail: string;
  startTime: Date;
  endTime: Date;
}): Promise<ICalendarEventResponse> => {
  return createCalendarEvent({
    summary: `Tutor Interview - ${interview.applicantName}`,
    description: `Interview with ${interview.applicantName} for tutor application.`,
    startTime: interview.startTime,
    endTime: interview.endTime,
    attendees: [interview.applicantEmail, interview.adminEmail],
    sendUpdates: true,
  });
};

export const GoogleCalendarService = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  createSessionCalendarEvent,
  createInterviewCalendarEvent,
};
