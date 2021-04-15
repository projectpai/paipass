import * as R from 'ramda';

import { URL_BASE, SUCCESS_200, STATUS_ERROR_400, STATUS_ERROR_404, STATUS_ERROR_422 } from '../util';
import Cookies from 'js-cookie';

export default class SsoService {

  fetchCredentials = (url, args) => fetch(url, { credentials: 'include', cache: 'no-cache', redirect: 'follow', ...args });

  getAuthorizeDetails() {
    const transformResponse = R.cond([
      [R.compose(R.equals(STATUS_ERROR_400), R.prop('status')), R.always(new Error('A required parameter was not submitted in the request.'))],
      [R.compose(R.equals(STATUS_ERROR_404), R.prop('status')), R.always(new Error('No resource was found at the given path.'))],
      [R.compose(R.equals(STATUS_ERROR_422), R.prop('status')), res => res.json()],
      [R.compose(R.equals(SUCCESS_200), R.prop('status')), res => res.json()],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_SSO_AUTHORIZE_DETAILS_EP
      }`,
      {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      }
    )
      .then(transformResponse)
      .catch(() => new Error('unexpected error occurred.'));
  }
};
