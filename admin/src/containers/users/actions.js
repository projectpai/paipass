import {ActionTypes} from '../../common/constants';

import {DataManager} from '../../common';

export function getUsers(
    {
        perPage,
        orderBy,
        orderDir,
        page,
        email,
    }
) {
    const params = {perPage, orderBy, orderDir, page};

    if (email) {
        params.email = email;
    }

    return dispatch => {
        dispatch({
            type: ActionTypes.GET_LIST_OF_USERS_REQUEST
        });
        DataManager.instance.get('/api/v1/accounts', {params})
            .then(response => {
                dispatch({
                    type: ActionTypes.GET_LIST_OF_USERS_SUCCESS,
                    payload: response.data
                });
            })
            .catch(error => {
                dispatch({
                    type: ActionTypes.GET_LIST_OF_USERS_FAILURE,
                    payload: error.response ? `${error.response.status} ${error.response.statusText}` : {}
                });
            });
    }
}