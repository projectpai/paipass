import {ActionTypes} from '../../common/constants';
import {DataManager} from '../../common';

const sortByMap = {
    "reviewer": "REVIEWER_ID",
    "status": "STATUS",
    "submitter": "SUBMITTER_ID",
    "reviewTime": "REVIEW_TIMESTAMP",
    "submissionDate": "SUBMISSION_TIMESTAMP"
}

export function getReviews(
    {
        perPage,
        orderBy,
        orderDir,
        page,
        status,
        submitter
    }
) {
    orderBy = sortByMap[orderBy];
    const params = {perPage, orderBy, orderDir, page};

    if (status) {
        params.status = status;
    }
    if (submitter) {
        params.submitterEmail = submitter;
    }

    return dispatch => {
        dispatch({
            type: ActionTypes.GET_REVIEWS_LIST_REQUEST
        });

        DataManager.instance.get('/api/v1/account/identity-verifications', {params})
            .then(response => {
                dispatch({
                    type: ActionTypes.GET_REVIEWS_LIST_SUCCESS,
                    payload: response.data
                });
            }).catch(error => {
            dispatch({
                type: ActionTypes.GET_REVIEWS_LIST_FAILURE,
                payload: error.response ? `${error.response.status} ${error.response.statusText}` : {}
            });
        });
    }
}
