"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = exports.createInterviewCalendarEvent = exports.createSessionCalendarEvent = exports.getCalendarEvent = exports.deleteCalendarEvent = exports.updateCalendarEvent = exports.createCalendarEvent = void 0;

const getOAuth2Client = () => {

    throw new Error('Google Calendar OAuth2 client not configured');
};

const createCalendarEvent = (eventData) => __awaiter(void 0, void 0, void 0, function* () {
    try {

        return {
            eventId: `placeholder-${Date.now()}`,
            meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
            htmlLink: 'https://calendar.google.com/placeholder',
            status: 'confirmed',
        };
    }
    catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
});
exports.createCalendarEvent = createCalendarEvent;

const updateCalendarEvent = (eventId, eventData) => __awaiter(void 0, void 0, void 0, function* () {
    try {

        return {
            eventId,
            meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
            htmlLink: 'https://calendar.google.com/placeholder',
            status: 'confirmed',
        };
    }
    catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
    }
});
exports.updateCalendarEvent = updateCalendarEvent;

const deleteCalendarEvent = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    try {

        console.log(`Calendar event ${eventId} deleted (placeholder)`);
    }
    catch (error) {
        console.error('Error deleting calendar event:', error);
        throw error;
    }
});
exports.deleteCalendarEvent = deleteCalendarEvent;

const getCalendarEvent = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    try {

        return {
            eventId,
            meetLink: `https://meet.google.com/placeholder-${Math.random().toString(36).substring(7)}`,
            htmlLink: 'https://calendar.google.com/placeholder',
            status: 'confirmed',
        };
    }
    catch (error) {
        console.error('Error getting calendar event:', error);
        throw error;
    }
});
exports.getCalendarEvent = getCalendarEvent;

const createSessionCalendarEvent = (session) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.createCalendarEvent)({
        summary: `${session.subject} Tutoring Session`,
        description: `Tutoring session between ${session.studentName} and ${session.tutorName}.\n\nSubject: ${session.subject}`,
        startTime: session.startTime,
        endTime: session.endTime,
        attendees: [session.studentEmail, session.tutorEmail],
        sendUpdates: true,
    });
});
exports.createSessionCalendarEvent = createSessionCalendarEvent;

const createInterviewCalendarEvent = (interview) => __awaiter(void 0, void 0, void 0, function* () {
    return (0, exports.createCalendarEvent)({
        summary: `Tutor Interview - ${interview.applicantName}`,
        description: `Interview with ${interview.applicantName} for tutor application.`,
        startTime: interview.startTime,
        endTime: interview.endTime,
        attendees: [interview.applicantEmail, interview.adminEmail],
        sendUpdates: true,
    });
});
exports.createInterviewCalendarEvent = createInterviewCalendarEvent;
exports.GoogleCalendarService = {
    createCalendarEvent: exports.createCalendarEvent,
    updateCalendarEvent: exports.updateCalendarEvent,
    deleteCalendarEvent: exports.deleteCalendarEvent,
    getCalendarEvent: exports.getCalendarEvent,
    createSessionCalendarEvent: exports.createSessionCalendarEvent,
    createInterviewCalendarEvent: exports.createInterviewCalendarEvent,
};
