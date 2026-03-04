import { USER_ROLES } from '../../../enums/user';
import { User } from '../user/user.model';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { Session } from '../session/session.model';
import { MonthlyBilling } from '../monthlyBilling/monthlyBilling.model';
import { TutorEarnings } from '../tutorEarnings/tutorEarnings.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { TrialRequest } from '../trialRequest/trialRequest.model';

/**
 * Convert JSON data to CSV format
 */
const jsonToCSV = (data: any[], headers?: string[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders
      .map(header => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle objects/arrays (convert to JSON string)
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Export all users to CSV
 */
const exportUsers = async (role?: string): Promise<string> => {
  const query = role ? { role } : {};
  const users = await User.find(query).select(
    'name email role phone createdAt'
  );

  const data = users.map(user => ({
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || 'N/A',
    joinedAt: user.createdAt?.toISOString().split('T')[0],
  }));

  return jsonToCSV(data);
};

/**
 * Export tutor applications to CSV
 */
const exportApplications = async (status?: string): Promise<string> => {
  const query = status ? { status } : {};
  const applications = await TutorApplication.find(query).select(
    'name email status subjects city submittedAt approvedAt rejectedAt'
  );

  const data = applications.map((app) => ({
    applicantName: app.name || 'N/A',
    applicantEmail: app.email || 'N/A',
    status: app.status,
    subjects: app.subjects.join('; '),
    city: app.city || 'N/A',
    appliedAt: app.submittedAt?.toISOString().split('T')[0],
    approvedAt: app.approvedAt?.toISOString().split('T')[0] || 'N/A',
  }));

  return jsonToCSV(data);
};

/**
 * Export sessions to CSV
 */
const exportSessions = async (
  status?: string,
  startDate?: Date,
  endDate?: Date
): Promise<string> => {
  const query: any = {};
  if (status) query.status = status;
  if (startDate || endDate) {
    query.startTime = {};
    if (startDate) query.startTime.$gte = startDate;
    if (endDate) query.startTime.$lte = endDate;
  }

  const sessions = await Session.find(query)
    .populate('studentId', 'name email')
    .populate('tutorId', 'name email')
    .select(
      'studentId tutorId subject startTime endTime duration pricePerHour totalPrice status completedAt'
    );

  const data = sessions.map(session => ({
    studentName: (session.studentId as any)?.name || 'N/A',
    studentEmail: (session.studentId as any)?.email || 'N/A',
    tutorName: (session.tutorId as any)?.name || 'N/A',
    tutorEmail: (session.tutorId as any)?.email || 'N/A',
    subject: session.subject,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    durationMinutes: session.duration,
    pricePerHour: session.pricePerHour,
    totalPrice: session.totalPrice,
    status: session.status,
    completedAt: session.completedAt?.toISOString() || 'N/A',
  }));

  return jsonToCSV(data);
};

/**
 * Export monthly billings to CSV
 */
const exportBillings = async (
  status?: string,
  year?: number,
  month?: number
): Promise<string> => {
  const query: any = {};
  if (status) query.status = status;
  if (year) query.billingYear = year;
  if (month) query.billingMonth = month;

  const billings = await MonthlyBilling.find(query)
    .populate('studentId', 'name email')
    .select(
      'studentId billingMonth billingYear invoiceNumber totalSessions totalHours subtotal tax total status paidAt'
    );

  const data = billings.map(billing => ({
    studentName: (billing.studentId as any)?.name || 'N/A',
    studentEmail: (billing.studentId as any)?.email || 'N/A',
    invoiceNumber: billing.invoiceNumber,
    billingPeriod: `${billing.billingYear}-${billing.billingMonth.toString().padStart(2, '0')}`,
    totalSessions: billing.totalSessions,
    totalHours: billing.totalHours.toFixed(2),
    subtotal: billing.subtotal.toFixed(2),
    tax: billing.tax.toFixed(2),
    total: billing.total.toFixed(2),
    status: billing.status,
    paidAt: billing.paidAt?.toISOString().split('T')[0] || 'N/A',
  }));

  return jsonToCSV(data);
};

/**
 * Export tutor earnings to CSV
 */
const exportEarnings = async (
  status?: string,
  year?: number,
  month?: number
): Promise<string> => {
  const query: any = {};
  if (status) query.status = status;
  if (year) query.payoutYear = year;
  if (month) query.payoutMonth = month;

  const earnings = await TutorEarnings.find(query)
    .populate('tutorId', 'name email')
    .select(
      'tutorId payoutMonth payoutYear payoutReference totalSessions totalHours grossEarnings platformCommission netEarnings status paidAt'
    );

  const data = earnings.map(earning => ({
    tutorName: (earning.tutorId as any)?.name || 'N/A',
    tutorEmail: (earning.tutorId as any)?.email || 'N/A',
    payoutReference: earning.payoutReference,
    payoutPeriod: `${earning.payoutYear}-${earning.payoutMonth.toString().padStart(2, '0')}`,
    totalSessions: earning.totalSessions,
    totalHours: earning.totalHours.toFixed(2),
    grossEarnings: earning.grossEarnings.toFixed(2),
    platformCommission: earning.platformCommission.toFixed(2),
    netEarnings: earning.netEarnings.toFixed(2),
    status: earning.status,
    paidAt: earning.paidAt?.toISOString().split('T')[0] || 'N/A',
  }));

  return jsonToCSV(data);
};

/**
 * Export subscriptions to CSV
 */
const exportSubscriptions = async (status?: string): Promise<string> => {
  const query = status ? { status } : {};
  const subscriptions = await StudentSubscription.find(query)
    .populate('studentId', 'name email')
    .select('studentId tier pricePerHour status startDate endDate createdAt');

  const data = subscriptions.map(sub => ({
    studentName: (sub.studentId as any)?.name || 'N/A',
    studentEmail: (sub.studentId as any)?.email || 'N/A',
    tier: sub.tier,
    pricePerHour: sub.pricePerHour,
    status: sub.status,
    startDate: sub.startDate?.toISOString().split('T')[0] || 'N/A',
    endDate: sub.endDate?.toISOString().split('T')[0] || 'N/A',
    createdAt: sub.createdAt?.toISOString().split('T')[0],
  }));

  return jsonToCSV(data);
};

/**
 * Export trial requests to CSV
 */
const exportTrialRequests = async (status?: string): Promise<string> => {
  const query = status ? { status } : {};
  const requests = await TrialRequest.find(query)
    .populate('studentId', 'name email')
    .populate('acceptedTutorId', 'name email')
    .populate('subject', 'name');

  const data = requests.map(req => ({
    studentName: req.studentInfo?.name || 'N/A',
    studentEmail: req.studentInfo?.email || 'N/A',
    isUnder18: req.studentInfo?.isUnder18 ? 'Yes' : 'No',
    guardianName: req.studentInfo?.guardianInfo?.name || 'N/A',
    guardianEmail: req.studentInfo?.guardianInfo?.email || 'N/A',
    guardianPhone: req.studentInfo?.guardianInfo?.phone || 'N/A',
    subject: (req.subject as any)?.name || 'N/A',
    gradeLevel: req.gradeLevel || 'N/A',
    schoolType: req.schoolType || 'N/A',
    status: req.status,
    acceptedTutorName: (req.acceptedTutorId as any)?.name || 'N/A',
    acceptedTutorEmail: (req.acceptedTutorId as any)?.email || 'N/A',
    createdAt: (req as any).createdAt?.toISOString().split('T')[0] || 'N/A',
    expiresAt: req.expiresAt?.toISOString().split('T')[0] || 'N/A',
  }));

  return jsonToCSV(data);
};

export const ExportService = {
  exportUsers,
  exportApplications,
  exportSessions,
  exportBillings,
  exportEarnings,
  exportSubscriptions,
  exportTrialRequests,
};
