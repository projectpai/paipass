import {ActionTypes} from '../../common/constants';

const defaultState = {
    fetching: false,
    reviewers: []
};
const draw = 0;

export default function (state = defaultState, action) {
    switch (action.type) {
        case ActionTypes.GET_REVIEWS_LIST_REQUEST:
            return {...state, fetching: true};

        case ActionTypes.GET_REVIEWS_LIST_SUCCESS:
            return {
                ...state,
                draw: draw + 1,
                recordsTotal: action.payload.totalRecords,
                recordsFiltered: action.payload.totalRecords,
                data: action.payload.records,
                fetching: false
            };

        case ActionTypes.GET_REVIEWS_LIST_FAILURE:
            let resultFailure = {
                draw: draw,
                recordsTotal: null,
                recordsFiltered: null,
                data: []
            };
            return {...state, data: [], fetching: false}; // @TODO: should it return ${resultFailure}?

        case ActionTypes.GET_REVIEWERS_LIST_SUCCESS:
            return {...state, reviewers: action.payload.content.usersApp};

        default:
            return {...state};
    }

}
