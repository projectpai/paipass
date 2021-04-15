import axios from 'axios';
import qs from 'qs';
import Cookies from 'js-cookie';

import { DataManager, Notification } from '../../common';
import { ActionTypes, Config } from '../../common/constants';

export function login({ email, password }) {
    let data = {
        email: email,
        password: password,
        app: 'webapp-video-review'
    };

    let headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': '*/*',
        'cache-control': 'no-cache',

    };

    return dispatch => {
        dispatch({
            type: ActionTypes.LOGIN_REQUEST,
        });

        axios.get(`${Config.url}/api/v1/account/profile`, { withCredentials: true }, headers
        ).then(({ data }) => {
            const { email, accountVerified} = data;

            Notification.showSuccess('Login Success');
            DataManager.create({});
            dispatch({
                type: ActionTypes.LOGIN_SUCCESS,
                payload: data
            });
        }).catch(error => {
            Notification.showError(error.response ? error.response.data.message : 'User authentication failed');
            dispatch({
                type: ActionTypes.LOGIN_FAILURE,
                payload: error.response ? error.response.data : {}
            });
        });
    }
}

export function logout() {
    return dispatch => {
        return DataManager.instance
            .get('/account/logout')
            .then(response => {

                DataManager.destroy();
                dispatch({
                    type: ActionTypes.LOGOUT_SUCCESS,
                    payload: response.data
                });
            }).catch(error => {
                dispatch({
                    type: ActionTypes.LOGOUT_FAILURE,
                    payload: error.response ? error.response.data : {}
                });
            });
    }
}
