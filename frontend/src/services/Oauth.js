import * as R from 'ramda';

import { URL_BASE, SUCCESS_200, STATUS_ERROR_400, STATUS_ERROR_404, STATUS_ERROR_422 } from '../util';
import Cookies from 'js-cookie';

export default class OathService {

  fetchCredentials = (url, args) => fetch(url, {
    credentials: 'include',
    cache: 'no-cache',
    redirect: 'follow', ...args,
  });

  getAuthorizeDetails({ clientID, scopeList }) {
    const transformResponse = R.cond([
      [R.compose(R.equals(STATUS_ERROR_400), R.prop('status')), R.always(new Error('A required parameter was not submitted in the request.'))],
      [R.compose(R.equals(STATUS_ERROR_404), R.prop('status')), R.always(new Error('No resource was found at the given path.'))],
      [R.compose(R.equals(STATUS_ERROR_422), R.prop('status')), res => res.json()],
      [R.compose(R.equals(SUCCESS_200), R.prop('status')), res => res.json()],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);
    let url = `${URL_BASE}/${
      process.env.REACT_APP_API_OAUTH_AUTHORIZE_DETAILS_EP
    }?client_id=${clientID}`;
    for (const scope of scopeList.split(' ')) {
      url += `&scope=${scope}`
    }

    return this.fetchCredentials(
      url,
      {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    )
      .then(transformResponse)
      .catch(() => new Error('unexpected error occurred.'));
  }


  getAppsWithGrantedAccess({
                             perPage,
                             orderBy,
                             orderDir,
                             page,
                             paicoin_address,
                           }) {

    const params = { perPage, orderBy, orderDir, page };

    if (paicoin_address) {
      params.paicoin_address = paicoin_address;
    }

    const transformResponse = R.cond([
      [R.compose(R.equals(STATUS_ERROR_400), R.prop('status')), R.always(new Error('A required parameter was not submitted in the request.'))],
      [R.compose(R.equals(STATUS_ERROR_404), R.prop('status')), R.always(new Error('No resource was found at the given path.'))],
      [R.compose(R.equals(STATUS_ERROR_422), R.prop('status')), res => res.json()],
      [R.compose(R.equals(SUCCESS_200), R.prop('status')), res => res.json()],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_OAUTH_GET_AUTHORIZED_APPS_EP
      }`,
      {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(params),
      },
    )
      .then(transformResponse)
      .catch(() => new Error('unexpected error occurred.'));
  }
};
