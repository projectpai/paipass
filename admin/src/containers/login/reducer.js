import { ActionTypes } from '../../common/constants';

import Cookies from 'js-cookie';
import encrypter from 'object-encrypter';

const engine = encrypter('2025afbe-8894-4261-9dd8-835b74ee4d76');
const defaultState = engine.decrypt(Cookies.get('l_us')) || {};

export default function (state = { ...defaultState, processing: false }, action) {

  switch (action.type) {
    case ActionTypes.LOGIN_REQUEST:
      return { ...state, processing: true }
    case ActionTypes.LOGIN_FAILURE:
      return { ...state, processing: false };
    case ActionTypes.LOGIN_SUCCESS:

      if (action.payload.responseJSON && action.payload.responseJSON.status.status === 'ERROR') {
        return defaultState;
      }

      var user = {
        processing: false,
        userId: action.payload.userId,
        token: action.payload.email,
        email: action.payload.email,
        accountVerified: action.payload.accountVerified,
      };

      Cookies.set('l_us', engine.encrypt(user), { expires: 1 });
      return { ...state, ...user };

    case ActionTypes.LOGOUT_SUCCESS:
      Cookies.remove('l_us');
      return {};

    case ActionTypes.REGISTER_SUCCESS:
      return { ...state, processing: false };

    case ActionTypes.CHANGE_PASSWORD_SUCCESS:
      return { ...state, processing: false };

    default:
      return { ...state };
  }

}
