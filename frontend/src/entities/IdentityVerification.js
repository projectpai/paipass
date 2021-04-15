import { Record, List } from 'immutable';

export const IdentityVerificationEntity = Record({
  requestId: '',
  words: List,
});
