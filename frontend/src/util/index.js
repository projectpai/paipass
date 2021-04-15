import * as R from 'ramda';
export const WS_URL_BASE =
  process.env.NODE_ENV === 'development'
    ? process.env.REACT_APP_WS_API_URL
    : process.env.REACT_APP_WS_API_URL;

export const URL_BASE =
  process.env.NODE_ENV === 'development'
    ? `${process.env.REACT_APP_API_URL}`
    : process.env.REACT_APP_API_URL;


// export const URL_BASE = process.env.REACT_APP_API_URL_DEMO; // DEMO API

export const SUCCESS_200 = 200;
export const STATUS_ERROR_400 = 400;
export const STATUS_ERROR_401 = 401;
export const STATUS_ERROR_403 = 403;
export const STATUS_ERROR_404 = 404;
export const STATUS_ERROR_422 = 422;

export const READ_OWNER =
  'Access Data (Limited) - Allows the application to access this data, but not modify it.  The application can not access data from other applications';
export const READ =
  'Access Data - Allows the application to access this data, but not modify it.';
export const READ_WRITE_OWNER =
  'Modify Data (Limited) - Allows the application to access and modify this data.  The application can not access or modify data from other applications.';
export const READ_WRITE =
  'Modify Data - Allows the application to access and modify this data.';

export const objFromListWith = R.curry((fn, list) =>
  R.chain(R.zipObj, R.map(fn))(list),
);

export const transformResponse = R.cond([
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
