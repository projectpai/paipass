import { Record, List } from 'immutable';

export const OwnerScopeEntity = Record({
  uuid: '',
  name: '',
  description: '',
});

export const SCOPE_APPROVED = 'APPROVED';
export const SCOPE_DENIED = 'DENIED';

export const ScopesDetailsEntity = Record({
  description: '',
  name: '',
  namespace: '',
  owner: new OwnerScopeEntity(),
  accessLevel: '',
  approvalStatus: SCOPE_APPROVED,
});


export const AuthorizeDetailsEntity = Record({
  name: '',
  description: '',
  scopes: List(),
});
