import * as R from 'ramda';
import Cookies from 'js-cookie';
import axios from 'axios';

import {
  URL_BASE,
  SUCCESS_200,
  STATUS_ERROR_400,
  STATUS_ERROR_401,
  STATUS_ERROR_403,
  STATUS_ERROR_404,
  STATUS_ERROR_422,
} from '../util';

export const EMAIL_INVALID = 'EMAIL_INVALID';
export const EMAIL_IN_USE = 'EMAIL_IN_USE';
export const PHONE_INVALID = 'PHONE_INVALID';
export const PHONE_IN_USE = 'PHONE_IN_USE';
export const PASSWORD_INVALID = 'PASSWORD_INVALID';
export const PHONE_VERIFICATION_INVALID_CODE = 'INVALID_CODE';
export const PHONE_VERIFICATION_EXPIRED_CODE = 'EXPIRED_CODE';
export const EMAIL_VERIFICATION_INVALID_CODE = 'INVALID_CODE';
export const EMAIL_VERIFICATION_EXPIRED_CODE = 'EXPIRED_CODE';
export const CODE_NOT_VERIFIED = 'CODE_NOT_VERIFIED';
export const CODE_EXPIRED = ' CODE_EXPIRED';
export const CODE_ALREADY_EXCHANGED = 'CODE_ALREADY_EXCHANGED';
export const USER_HAS_NOT_PHONE = 'USER_HAS_NOT_PHONE';
export const NOT_FOUND = 'NOT_FOUND';
export const CODE_ALREADY_VERIFIED = 'CODE_ALREADY_VERIFIED';
export const CODES_NOT_MATCH = 'CODES_NOT_MATCH';
export const UNSUBSCRIBE_HASH_INVALID = 'UNSUBSCRIBE_HASH_INVALID';

const defaultTransformResponse = R.cond([
  [
    R.compose(
      R.equals(STATUS_ERROR_400),
      R.prop('status'),
    ),
    R.always(new Error('A required parameter was missing.')),
  ],
  [
    R.compose(
      R.equals(STATUS_ERROR_401),
      R.prop('status'),
    ),
    R.always(
      new Error(
        'The request did not include the required authentication tokens.',
      ),
    ),
  ],
  [
    R.compose(
      R.equals(STATUS_ERROR_422),
      R.prop('status'),
    ),
    res => res.json(),
  ],
  [
    R.compose(
      R.equals(SUCCESS_200),
      R.prop('status'),
    ),
    res => res.json(),
  ],
  [R.T, R.always(new Error('unexpected error occurred.'))],
]);

export default class AccountService {
  fetchCredentials = (url, args) =>
    fetch(url, {
      credentials: 'include',
      cache: 'no-cache',
      redirect: 'follow',
      ...args,
    });

  create({ email, password, phone_number, search, accountType }) {
    return fetch(`${URL_BASE}/${process.env.REACT_APP_API_ACCOUNT_EP}${search}`, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),

      },
      body: JSON.stringify({ email, password, phone_number, accountType }),
    })
      .then(response => {
        if (response.status === 400) {
          return new Error(
            'A required parameter was not submitted in the request.',
          );
        } else if (response.status === 500) {
          return new Error('Unexpected error occurred.');
        } else if (
          response.status === 200 ||
          response.status === 201 ||
          response.status === 422 ||
          response.status === 404 ||
          response.status === 302
        ) {
          return response.json();
        }
      })
      .catch((e) => {
        console.log('Error', e.stack);
        console.log('Error', e.name);
        console.log('Error', e.message);
        throw new Error('unexpected error occurred.');
      });
  }

  requestCodeVerification({ requestId }) {
    return fetch(
      `${URL_BASE}/${process.env.REACT_APP_AP_REQUEST_CODE_EP}/${requestId}`,
      {
        method: 'GET',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error(
            'A required parameter was not submitted in the request.',
          );
        } else if (response.status >= 500) {
          return new Error('Unexpected error occurred.');
        } else if (
          response.status === 200 ||
          response.status === 422 ||
          response.status === 404 ||
          response.status === 401
        ) {
          return response.json();
        }
      })
      .catch(() => {
        throw new Error('unexpected error occurred.');
      });
  }

  codeNumberVerification({ verificationCode, secondFactorToken }) {
    return fetch(
      `${URL_BASE}/${
        process.env.REACT_APP_AP_VERIFY_CODE_EP
      }${secondFactorToken}/`,
      {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ verificationCode }),
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error(
            'A required parameter was not submitted in the request.',
          );
        } else if (response.status === 401) {
          return new Error('The code provided does not match.');
        } else if (response.status === 500) {
          return new Error('Unexpected error occurred.');
        } else if (response.status === 422 || response.status === 404) {
          return response.json();
        } else if (response.status === 200) return true;
        return new Error('unexpected error occurred.');
      })
      .catch(() => {
        throw new Error('unexpected error occurred.');
      });
  }

  phoneNumberVerification({ verificationCode, phoneVerificationRequestId }) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(
          new Error('A required parameter was not submitted in the request.'),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_404),
          R.prop('status'),
        ),
        R.always(new Error('No resource was found at the given path.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        R.T,
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);
    return fetch(
      `${URL_BASE}/${
        process.env.REACT_APP_API_PHONE_VERIFICATION_EP
      }${phoneVerificationRequestId}/`,
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ verificationCode }),
      },
    )
      .then(transformResponse)
      .catch(() => new Error('unexpected error occurred.'));
  }

  phoneNumberReset({ phone }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_PHONE_VERIFICATION_EP}reset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ phone }),
      },
    )
      .then(res => {
        if (res.status === SUCCESS_200) {
          return res.json();
        } else {
          return new Error('Something went wrong.');
        }
      })
      .catch(err => {
        throw new Error('Something went wrong.');
      });
  }

  emailVerification({ key }) {
    return fetch(
      `${URL_BASE}/${
        process.env.REACT_APP_API_EMAIL_VERIFICATION_EP
      }`,
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        // credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ key }),
      },
    )
      .then(response => {
        if (response.status === 400) {
          throw new Error(
            'A required parameter was not submitted in the request.',
          );
        } else if (response.status === 404) {
          throw new Error('No resource was found at the given path.');
        } else if (response.status === 422) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(() => {
        return new Error('unexpected error occurred.');
      });
  }

  emailReset({ email }) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        R.T,
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_RESEND_EMAIL_VERIFICATION_EP}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ email }),
      },
    )
      .then(transformResponse)
      .catch(err => new Error('Something went wrong.', err));
  }

  login({ email, password }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_LOGIN_EP}`,
      {
        method: 'POST',
        body: `email=${email}&password=${password}`,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          //'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.redirected) {
          if (response.status === 401) {
            return { goTo: '/process' }; // TODO: change to a immutable Entity
          } else {
            try {
              document.location.href = response.url;
            } catch (err) {
              return Error('Unexpected redirected.');
            }
          }
        } else if (response.status === 200) {
          return true;
        } else if (response.status === 302) {
          return Error('Unexpected redirected.');
        } else if (response.status === 401) {
          return new Error(
            'The email address or password entered doesn\'t match an active account.',
          );
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err); // TODO: dispatch global Error.
      });
  }

  logout() {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_LOGOUT_EP}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
    })
      .then(response => {
        return { goTo: '/' }; // TODO: change to a immutable Entity
      })
      .catch(err => {
        return new Error('Unexpected error occurred: ', err); // TODO: dispatch global Error.
      });
  }

  nameSetup({ fullName }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_IDENTITY_VERIFICATION_EP}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ full_name: fullName }),
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include authentication tokens.',
          );
        } else if (response.status === 403) {
          return new Error(
            'The current user does not have permission to run this endpoint.',
          );
        } else if (response.status === 201) {
          return response.json();
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err);
      });
  }

  videoSetup({ requestId, video }) {
    if (!requestId) {
      throw new Error('A required parameter was missing: requestId');
    }

    const formData = new FormData();
    formData.append('video', video);

    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_IDENTITY_VERIFICATION_EP
      }${requestId}/finalize/`,
      {
        method: 'PUT',
        body: formData,
        headers: {
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include authentication tokens.',
          );
        } else if (response.status === 403) {
          return new Error(
            'The current user does not have permission to run this endpoint.',
          );
        } else if (response.status === 404) {
          return new Error(
            'No verification request belonging to the current user was found for the given requestUUID.',
          );
        } else if (response.status === 422) {
          return new Error(
            'One or more of the provided parameters failed validation.',
          );
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err);
      });
  }

  forgotPassword({ email, language }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_FORGOT_PASSWORD_EP}`,
      {
        method: 'POST',
        body: JSON.stringify({ email: email, language: language }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 422) {
          return new Error(
            'One or more of the provided parameters failed validation.',
          );
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err);
      });
  }

  resetPassword({
                  requestId,
                  token,
                  password,
                  secondFactorAuthenticationToken,
                }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_RESET_PASSWORD_EP}${requestId}/`,
      {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          secondFactorAuthenticationToken,
        }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 422) {
          return new Error(
            'One or more of the provided parameters failed validation.',
          );
        } else if (response.status === 401) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err);
      });
  }

  unsubscribe({ email, nonce, hash }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_UNSUBSCRIBE_EP}`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          nonce,
          hash,
        }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 422) {
          return new Error(
            'One or more of the provided parameters failed validation.',
          );
        } else if (response.status === 401) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        throw new Error('Unexpected error occurred: ', err);
      });
  }

  changePassword({ new_password1, new_password2, old_password }) {
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_CHANGE_PASSWORD_EP}`,
      {
        method: 'POST',
        body: JSON.stringify({
          new_password1, new_password2,
          old_password,
        }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include the required authentication tokens.',
          );
        } else if (response.status === 422) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        return new Error('unexpected error occurred.', err);
      });
  }

  updateProfile({ email, phone, currentPassword }) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);
    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_ACCOUNT_PROFILE_EP}update/`,
      {
        method: 'PUT',
        body: JSON.stringify({
          password: currentPassword,
          email,
          phone_number: phone,
        }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  upgradeProfile() {
    return this.fetchCredentials(`${URL_BASE}/account/switch-to-premium`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    });
  }

  generate_pdp2_payment_addr() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_GEN_PAY_ADDR}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
    ;
  }

  send_pdp2_data(pub_key_addr, pub_key, variantValues, encryptionValue) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_SEND_DATA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      }, body: JSON.stringify(
        {
          pub_key_addr: pub_key_addr,
          pub_key: pub_key,
          variant_values: variantValues,
          encryption_value: encryptionValue,

        }),
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
    ;
  }

  retrieve_pdp2_torrent(uuid) {

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_RETRIEVE_TORRENT}/${uuid}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));

  }

  retrieve_pdp2_torrent_uuid_from_txid(txid) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_RETRIEVE_TORRENT_INFO_FROM_TXID}${txid}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
    ;
  }

  bypassPdp2Payment(pub_key_addr, amount_requested) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2}bypass-payment-received/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
      body: JSON.stringify(
        {
          pub_key_addr: pub_key_addr,
          paid_amount: amount_requested,

        }),
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
    ;
  }

  get_pdp2_torrent_info() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2}get-torrent-info/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));


  }

  get_pdp2_sub_status() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2}pdp2-activation-status/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }


  change_pdp2_activation_status(to_status) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2}pdp2-activation-status/${to_status}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }


  get_pdp2_payment_addr_info() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2}payment/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
    ;
  }


  profile() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_400),
          R.prop('status'),
        ),
        R.always(new Error('A required parameter was missing.')),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error(
            'The request did not include the required authentication tokens.',
          ),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_422),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_ACCOUNT_PROFILE_EP}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    )
      .then(transformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getApplicationsNamespaces() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error('The request did not include authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_403),
          R.prop('status'),
        ),
        R.always(
          new Error('The request contained invalid authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_USER_ATTR_EP}namespaces/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    ).then(transformResponse);
  }

  getApplications() {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error('The request did not include authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_403),
          R.prop('status'),
        ),
        R.always(
          new Error('The request contained invalid authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_ACCOUNT_OWNER_EP}applications/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    ).then(transformResponse);
  }

  getAttributes(id) {
    const transformResponse = R.cond([
      [
        R.compose(
          R.equals(STATUS_ERROR_401),
          R.prop('status'),
        ),
        R.always(
          new Error('The request did not include authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(STATUS_ERROR_403),
          R.prop('status'),
        ),
        R.always(
          new Error('The request contained invalid authentication tokens.'),
        ),
      ],
      [
        R.compose(
          R.equals(SUCCESS_200),
          R.prop('status'),
        ),
        res => res.json(),
      ],
      [R.T, R.always(new Error('unexpected error occurred.'))],
    ]);

    return this.fetchCredentials(
      `${URL_BASE}/${process.env.REACT_APP_API_USER_ATTR_EP}data/${id}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    ).then(transformResponse);
  }

  revokeApplication({ applicationUUID }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_ACCOUNT_OWNER_APPLICATION_EP
      }${applicationUUID}/`,
      {
        method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include the required authentication tokens.',
          );
        } else if (response.status === 422) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        return new Error('unexpected error occurred.', err);
      });
  }

  deleteAttributeValue({ id, namespace, keyName }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_OAUTH_ATTR_EP
      }${namespace}/${keyName}/${id}/`,
      {
        method: 'DELETE',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    ).then(response => {
      if (response.status === 400) {
        throw new Error('A required parameter was missing.');
      } else if (response.status === 401) {
        throw new Error(
          'The request did not include the required authentication tokens.',
        );
      } else if (response.status === 422) {
        throw new Error('The request could not be executed.');
      } else if (response.status === 200) {
        return true;
      } else {
        throw new Error('An unexpected error occurred.');
      }
    });
  }

  updateAttributeValue({ namespace, keyName, id, value }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_OAUTH_ATTR_EP
      }${namespace}/${keyName}/${id}/`,
      {
        method: 'POST',
        body: JSON.stringify({ value }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    ).then(response => {
      if (response.status === 400) {
        throw new Error('A required parameter was missing.');
      } else if (response.status === 401) {
        throw new Error(
          'The request did not include the required authentication tokens.',
        );
      } else if (response.status === 422) {
        throw new Error('The value is not allowed.');
      } else if (response.status === 200) {
        return true;
      } else {
        throw new Error('An unexpected error occurred.');
      }
    });
  }

  createAttributeValue({ namespace, keyName, value }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_OAUTH_ATTR_EP
      }${namespace}/${keyName}/`,
      {
        method: 'POST',
        body: JSON.stringify({ value }),
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
      },
    ).then(response => {
      if (response.status === 400) {
        throw new Error('A required parameter was missing.');
      } else if (response.status === 401) {
        throw new Error(
          'The request did not include the required authentication tokens.',
        );
      } else if (response.status === 422) {
        throw new Error('The value is not allowed.');
      } else if (response.status === 200) {
        return response.json();
      } else {
        throw new Error('An unexpected error occurred.');
      }
    });
  }

  getApplication({ applicationUUID }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_ACCOUNT_OWNER_APPLICATION_EP
      }${applicationUUID}/`,
      {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include the required authentication tokens.',
          );
        } else if (response.status === 422) {
          return response.json();
        } else if (response.status === 200) {
          return response.json();
        }
      })
      .catch(err => {
        return new Error('unexpected error occurred.', err);
      });
  }

  changeApplication({ applicationUUID, permissions, attributes }) {
    return this.fetchCredentials(
      `${URL_BASE}/${
        process.env.REACT_APP_API_ACCOUNT_OWNER_APPLICATION_EP
      }${applicationUUID}/`,
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        body: JSON.stringify({ permissions, attributes }),
      },
    )
      .then(response => {
        if (response.status === 400) {
          return new Error('A required parameter was missing.');
        } else if (response.status === 401) {
          return new Error(
            'The request did not include the required authentication tokens.',
          );
        } else if (response.status === 422) {
          return response.json();
        } else if (response.status === 200) {
          return true;
        }
      })
      .catch(err => {
        return new Error('unexpected error occurred.', err);
      });
  }

  /** Yggdrasil **/
  createSchema(schema) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_YGG_SCHEMA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
      body: JSON.stringify(schema),

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getSchema(schema) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_YGG_SCHEMA}${schema}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getSchemas() {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_YGG_SCHEMAS}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  createDataset(dataset, fylesStuct) {
    const formData = new FormData();
    formData.append('tree', JSON.stringify({ ...dataset }));
    const fylesKeys = Object.keys(fylesStuct)
    for (const fyleKey of fylesKeys) {
        formData.append(fyleKey, fylesStuct[fyleKey]);
    }

    return axios(
      {
        url: `${URL_BASE}/${process.env.REACT_APP_API_YGG_DATASET}`,
        method: 'POST',
        headers: {
          'Content-Type': '',
          'X-CSRFToken': Cookies.get('csrftoken'),
        },
        withCredentials: true,
        data: formData,
      }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  updateDataset(datasetId, dataset) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_YGG_DATASET}${datasetId}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
      body: JSON.stringify({ ...dataset, dataset_id: datasetId }),

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getDataset(datasetId) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_YGG_DATASET}${datasetId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getData(dataId) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_GET_DATA_EP}${dataId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  getUploadProgress(dataset_id) {

    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PDP2_UPLOAD_PROGRESS}${dataset_id}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
      //body: JSON.stringify({files_pending_upload: filesPendingUpload}),

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  /** End Yggdrasil **/

  /** PAI Messages **/
  createThread(thread, application) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PAI_MSGS_THREAD}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
      body: JSON.stringify({thread, application}),

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }

  deleteThread(threadId) {
    return this.fetchCredentials(`${URL_BASE}/${process.env.REACT_APP_API_PAI_MSGS_THREAD}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-CSRFToken': Cookies.get('csrftoken'),
      },
      body: JSON.stringify({threadId}),

    }).then(defaultTransformResponse)
      .catch(err => new Error('unexpected error occurred.', err));
  }



  /** End PAI Messages **/
}
