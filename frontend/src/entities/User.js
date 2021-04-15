import { Record } from 'immutable';

export const UserEntity = Record({
  phoneVerificationRequestId: undefined,
  userId: undefined,
  email: '',
  accountVerified: 'UNVERIFIED',
  emailVerified: false,
  nameVerified: false,
  newEmail: '',
  newPhone: '',
  ongoingEmailVerification: false,
  ongoingNameVerification: false,
  ongoingPhoneVerification: false,
  phoneVerified: false,
  premiumLevel: 'FREE',
});
