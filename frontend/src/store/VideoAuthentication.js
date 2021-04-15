import { IdentityVerificationEntity } from '../entities/IdentityVerification';

// actions keys
export const UPDATE_IDENTITY = 'UPDATE_IDENTITY';

// actions

export const actionUpdateIdentity = (identity) => {
  return {
    type: UPDATE_IDENTITY,
    payload: identity,
  };
};

const initialState = {};

export const VideoAuthentication = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_IDENTITY:
      const newIDentity = new IdentityVerificationEntity({ ...action.payload });
      return newIDentity;
    default:
      return state;
  }
};
