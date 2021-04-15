import AccountService from 'services/Account';
import { combineReducers } from 'redux';
import { getAttributes } from './Attributes';
import { FETCH_ATTR_SUCCESS } from './Attributes';
import * as R from 'ramda';
import { objFromListWith } from '../util';
const api = new AccountService();
const FETCH_APPS_REQUEST = 'FETCH_APPS_REQUEST';
const FETCH_APPS_FAILURE = 'FETCH_APPS_ERROR';
const FETCH_APPS_SUCCESS = 'FETCH_APPS_SUCCESS';
const SET_CURRENT_APP = 'SET_CURRENT_APP';

export const setCurrent = id => dispatch => {
  dispatch({
    type: SET_CURRENT_APP,
    payload: { id },
  });
};

export const getApplications = () => dispatch => {
  dispatch({
    type: FETCH_APPS_REQUEST,
    payload: { loading: true },
  });
  api
    .getApplicationsNamespaces()
    .then(response => {
      if (response instanceof Error) {
        dispatch({
          type: FETCH_APPS_FAILURE,
          payload: { message: response.message },
        });
      } else if (response.length === 0) {
        dispatch({
          type: FETCH_APPS_SUCCESS,
        });
      } else if (response.length !== 0) {
        dispatch({
          type: FETCH_APPS_SUCCESS,
          payload: {
            applications: response,
          },
        });
        getAttributes(response[0].uuid)(dispatch);
      }
    })
    .catch(e => catchError(e, dispatch));
};
const catchError = (e, dispatch) => {
  dispatch({
    type: FETCH_APPS_FAILURE,
    payload: { message: e.message },
  });
};

const data = (state = {}, action) => {
  switch (action.type) {
    case FETCH_APPS_SUCCESS:
      return action.payload
        ? objFromListWith(R.prop('uuid'), action.payload.applications)
        : state;
    case FETCH_ATTR_SUCCESS:
      const { id, attributes } = action.payload;
      return {
        ...state,
        [id]: { ...state[id], attributes: attributes.map(obj => obj.id) },
      };
    default:
      return state;
  }
};

const errorMessage = (state = null, action) => {
  switch (action.type) {
    case FETCH_APPS_FAILURE:
      return action.payload.message;
    case FETCH_APPS_SUCCESS:
    case FETCH_APPS_REQUEST:
      return null;
    default:
      return state;
  }
};

const isLoading = (state = false, action) => {
  switch (action.type) {
    case FETCH_APPS_REQUEST:
      return true;
    case FETCH_APPS_SUCCESS:
    case FETCH_APPS_FAILURE:
      return false;
    default:
      return state;
  }
};
const current = (state = null, action) => {
  switch (action.type) {
    case FETCH_APPS_SUCCESS:
      if (action.payload) {
        return action.payload.applications[0].uuid;
      }
      return state;
    case SET_CURRENT_APP:
      return action.payload.id;
    default:
      return state;
  }
};

export const Applications = combineReducers({
  errorMessage,
  data,
  isLoading,
  current,
});
