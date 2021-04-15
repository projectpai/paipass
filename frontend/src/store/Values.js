import { FETCH_ATTR_SUCCESS } from './Attributes';
import AccountService from 'services/Account';
import { combineReducers } from 'redux';
import * as R from 'ramda';
import { objFromListWith } from '../util';
export const DELETE_VALUE_SUCCESS = 'DELETE_SUCCESS';
const DELETE_VALUE_ERROR = 'DELETE_VALUE_ERROR';
const SET_VALUE_EDITING = 'SET_VALUE_EDITING';
const SET_VALUE = 'SET_VALUE';
const SET_VALUE_ERROR = 'SET_VALUE_ERROR';
export const ADD_NEW_VALUE = 'ADD_NEW_VALUE';
export const SAVE_NEW_VALUE = 'SAVE_NEW_VALUE';
const SAVE_NEW_VALUE_ERROR = 'SAVE_NEW_VALUE_ERROR';
const SET_ERROR = 'SET_ERROR';
const api = new AccountService();

export const deleteAttributeValue = (
  idAttr,
  id,
  namespace,
  keyName,
) => async dispatch => {
  try {
    await api.deleteAttributeValue({ namespace, keyName, id });
    dispatch({
      type: DELETE_VALUE_SUCCESS,
      payload: { idAttr, id },
    });
  } catch (error) {
    catchError(error, DELETE_VALUE_ERROR, dispatch);
  }
};

export const SaveNewValue = (
  idAttr,
  oldIdValue,
  value,
  namespace,
  keyName,
) => async dispatch => {
  try {
    const response = await api.createAttributeValue({
      namespace,
      keyName,
      value,
    });
    const id = response.dataId;
    dispatch({
      type: SAVE_NEW_VALUE,
      payload: { id, oldIdValue, idAttr, value },
    });
  } catch (error) {
    catchError(error, SAVE_NEW_VALUE_ERROR, dispatch);
  }
};

export const updateValue = (
  id,
  value,
  namespace,
  keyName,
) => async dispatch => {
  try {
    await api.updateAttributeValue({ namespace, keyName, id, value });
    dispatch({
      type: SET_VALUE,
      payload: { id, value },
    });
  } catch (error) {
    catchError(error, SET_VALUE_ERROR, dispatch);
  }
};

export const setError = (id, hasError) => dispatch => {
  dispatch({
    type: SET_ERROR,
    payload: {
      id,
      hasError,
    },
  });
};

export const addNewValue = (idA, number) => dispatch => {
  dispatch({
    type: ADD_NEW_VALUE,
    payload: { idA, number },
  });
};

const catchError = (e, type, dispatch) => {
  dispatch({
    type: type,
    payload: { message: e.message || 'An unexpected error occurred' },
  });
};

export const setEditing = (idAttr, id) => (dispatch, getState) => {
  const state = getState();
  const value = state.Values.data[id];
  if (value.isNewValue) {
    dispatch({
      type: DELETE_VALUE_SUCCESS,
      payload: { idAttr, id },
    });
  } else {
    dispatch({
      type: SET_VALUE_EDITING,
      payload: { id },
    });
  }
};

const data = (state = {}, action) => {
  switch (action.type) {
    case FETCH_ATTR_SUCCESS:
      if (action.payload) {
        const values = action.payload.attributes.reduce((values, attribute) => {
          return [...values, ...attribute.values];
        }, []);
        return { ...state, ...objFromListWith(R.prop('id'), values) };
      }
      return state;
    case DELETE_VALUE_SUCCESS:
      return { ...R.omit([action.payload.id], state) };
    case SET_VALUE_EDITING:
      const { id } = action.payload;
      const value = state[id];
      return {
        ...state,
        [id]: { ...value, isEditing: !value.isEditing },
      };
    case SET_VALUE:
      const oldValue = state[action.payload.id];
      return {
        ...state,
        [action.payload.id]: {
          ...oldValue,
          value: action.payload.value,
          isEditing: false,
        },
      };
    case ADD_NEW_VALUE:
      const { idA, number } = action.payload;
      return {
        ...state,
        [idA + number]: {
          value: '',
          isEditing: true,
          isNewValue: true,
          id: idA + number,
          hasError: true,
        },
      };
    case SAVE_NEW_VALUE:
      return {
        ...R.omit([action.payload.oldIdValue], state),
        [action.payload.id]: {
          value: action.payload.value,
          id: action.payload.id,
          isEditing: false,
        },
      };
    case SET_ERROR:
      return {
        ...state,
        [action.payload.id]: {
          ...state[action.payload.id],
          hasError: action.payload.hasError,
        },
      };
    default:
      return state;
  }
};

const errorMessage = (state = null, action) => {
  switch (action.type) {
    case SAVE_NEW_VALUE_ERROR:
      return action.payload.message;
    case SET_VALUE_ERROR:
      return action.payload.message;
    case SAVE_NEW_VALUE:
    case SET_VALUE:
      return null;
    default:
      return state;
  }
};
const isLoading = (state = false, action) => state;

export const Values = combineReducers({
  errorMessage,
  data,
  isLoading,
});
