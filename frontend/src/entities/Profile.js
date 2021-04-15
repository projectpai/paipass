import { Record }  from 'immutable';

export const UserProfileEntity = Record({
  name: '',
  newName: '',
  nameVerified: false,
  email: '',
  newEmail: '',
  emailVerified: false,
  phone: '',
  newPhone: '',
  phoneVerified: false,
  ongoingEmailVerification: false,
  ongoingPhoneVerification: false,
  ongoingNameVerification: false,
  accountVerified: false,
});
