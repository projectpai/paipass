import {ActionTypes} from '../../common/constants';

const defaultState = {fetching: false};
let draw = 0;

export default function (state = defaultState, action) {
    switch (action.type) {
        case ActionTypes.GET_LIST_OF_USERS_REQUEST:
            return {...state, fetching: true};

        case ActionTypes.GET_LIST_OF_USERS_SUCCESS:
            console.log("payload", action.payload)
            return {
                ...state,
                draw: ++draw,
                recordsTotal: action.payload.totalRecords,
                recordsFiltered: action.payload.totalRecords,
                data: action.payload.records,
                fetching: false
            };

        case ActionTypes.GET_LIST_OF_USERS_FAILURE:
            return {...state, draw: ++draw, recordsTotal: null, recordsFiltered: null, data: [], fetching: false};

        default:
            return {...state};
    }

}