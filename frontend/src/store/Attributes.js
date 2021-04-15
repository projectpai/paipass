import AccountService from 'services/Account';
import { combineReducers } from 'redux';
import { objFromListWith } from '../util';
import * as R from 'ramda';
import { DELETE_VALUE_SUCCESS, SAVE_NEW_VALUE, ADD_NEW_VALUE } from './Values';
const api = new AccountService();
const FETCH_ATTR_REQUEST = 'FETCH_ATTR_REQUEST';
const FETCH_ATTR_FAILURE = 'FETCH_ATTR_ERROR';
export const FETCH_ATTR_SUCCESS = 'FETCH_ATTR_SUCCESS';

export const getAttributes = id => dispatch => {
  dispatch({
    type: FETCH_ATTR_REQUEST,
    payload: { loading: true },
  });
  api
    .getAttributes(id)
    .then(response => {
      if (response instanceof Error) {
        dispatch({
          type: FETCH_ATTR_FAILURE,
          payload: { message: response.message },
        });
      } else if (response.length !== 0) {
        dispatch({
          type: FETCH_ATTR_SUCCESS,
          payload: {
            id,
            attributes: response,
          },
        });
      } else if (response.length === 0) {
        dispatch({
          type: FETCH_ATTR_SUCCESS,
        });
      }
    })
    .catch(e => catchError(e, FETCH_ATTR_FAILURE, dispatch));
};

const catchError = (e, type, dispatch) => {
  dispatch({
    type: type,
    payload: { message: e.message || 'An unexpected error occurred' },
  });
};

const data = (state = {}, action) => {
  switch (action.type) {
    case FETCH_ATTR_SUCCESS:
      if (action.payload) {
        const newAttributes = action.payload.attributes.map(attr => {
          attr.idValues = attr.values.map(value => value.id);
          return attr;
        });
        return {
          ...state,
          ...objFromListWith(R.prop('id'), newAttributes),
        };
      }
      return state;
    case DELETE_VALUE_SUCCESS:
      const {
        payload: { idAttr, id },
      } = action;
      const attribute = state[idAttr];
      return {
        ...state,
        [idAttr]: {
          ...attribute,
          idValues: R.without([id], attribute.idValues),
        },
      };
    case ADD_NEW_VALUE:
      const {
        payload: { idA, number },
      } = action;
      const attr = state[idA];
      return {
        ...state,
        [idA]: {
          ...attr,
          idValues: attr.idValues.concat(idA + number),
        },
      };
    case SAVE_NEW_VALUE:
      const oldAttr = state[action.payload.idAttr];
      return {
        ...state,
        [action.payload.idAttr]: {
          ...oldAttr,
          idValues: R.without(
            [action.payload.oldIdValue],
            oldAttr.idValues.concat(action.payload.id),
          ),
        },
      };
    default:
      return state;
  }
};

const errorMessage = (state = null, action) => {
  switch (action.type) {
    case FETCH_ATTR_FAILURE:
      return action.payload.message;
    case FETCH_ATTR_SUCCESS:
    case FETCH_ATTR_REQUEST:
      return null;
    default:
      return state;
  }
};

const isLoading = (state = false, action) => {
  switch (action.type) {
    case FETCH_ATTR_REQUEST:
      return true;
    case FETCH_ATTR_SUCCESS:
    case FETCH_ATTR_FAILURE:
      return false;
    default:
      return state;
  }
};

export const Attributes = combineReducers({
  errorMessage,
  data,
  isLoading,
});
