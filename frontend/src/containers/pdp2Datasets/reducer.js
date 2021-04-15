import {ActionTypes} from '../../common/constants';

const defaultState = {
  fetching: false,
  data: [],
  count: -1,
};
const draw = 0;

export const Datasets = (state = defaultState, action) => {
  switch (action.type) {
    case ActionTypes.GET_PDP2_DATASETS_LIST_REQUEST:
      return {...state, fetching: true};

    case ActionTypes.GET_PDP2_DATASETS_LIST_SUCCESS:
      return {
        ...state,
        draw: draw + 1,
        data: action.payload.results,
        count: action.payload.count,
        fetching: false
      };

    case ActionTypes.GET_PDP2_DATASETS_LIST_FAILURE:
      let resultFailure = {
        draw: draw,
        recordsTotal: null,
        recordsFiltered: null,
        data: [],
        count: -1,
      };
      return {...state, data: [], fetching: false}; // @TODO: should it return ${resultFailure}?

    default:
      return {...state};
  }

}


