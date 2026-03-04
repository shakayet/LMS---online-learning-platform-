export enum USER_ROLES {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  APPLICANT = 'APPLICANT',
  GUEST = 'GUEST', // For public/unauthenticated access
}

export enum USER_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESTRICTED = 'RESTRICTED',
  DELETE = 'DELETE',
}
