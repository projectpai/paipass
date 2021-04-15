// actions keys
export const UPDATE_USER = 'UPDATE_USER';
export const UPDATE_USER_ERROR = 'UPDATE_USER_ERROR';
// actions
export const actionUpdateUser = user => {
  return {
    type: UPDATE_USER,
    payload: user,
  };
};

export const actionUpdateUserError = user => {
  return {
    type: UPDATE_USER_ERROR,
  };
};

const initialState = {
  isAuthenticated: false,
  isAuthenticating: true,
};

export const User = (state = initialState, { type, payload }) => {
  switch (type) {
    case UPDATE_USER:
      return {
        ...state,
        ...payload,
        isAuthenticated: true,
        isAuthenticating: false,
      };
    case UPDATE_USER_ERROR:
      return {
        isAuthenticated: false,
        isAuthenticating: false,
      };
    default:
      return state;
  }
};
