import { ActionTypes } from '../../common/constants/action-types';
import { URL_BASE, transformResponse } from '../../util';


const fetchCredentials = (url, args) => fetch(url, {
  credentials: 'include',
  cache: 'no-cache',
  redirect: 'follow', ...args,
});

const threads_get = (perPage, orderBy, orderDir, page, application) => {
  const params = { perPage, orderBy, orderDir, page,  };
  let url = null;
  if (application.client_id && application.client_id.length > 0){
    url = new URL(`${URL_BASE}/${process.env.REACT_APP_API_PAI_MSGS_THREADS}${application.client_id}/`);
  } else {
    url = new URL(`${URL_BASE}/${process.env.REACT_APP_API_PAI_MSGS_THREADS}`);
  }

  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  return fetchCredentials(url
    ,
    {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    },
  ).then(transformResponse);
};

const messages_get = (perPage, orderBy, orderDir, page, thread_id) => {
  const params = { perPage, orderBy, orderDir, page };
  const url = new URL(`${URL_BASE}/${process.env.REACT_APP_API_PAI_MSGS_MSGS}${thread_id}/`);

  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  return fetchCredentials(url
    ,
    {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
      },
    },
  ).then(transformResponse);

};


export function getPaiMessages(
  {
    perPage,
    orderBy,
    orderDir,
    page,
    thread_id,
    dispatch,
  },
) {


  dispatch({
    type: ActionTypes.GET_PAI_MESSAGES_MSG_LIST_REQUEST,
  });

  messages_get(perPage, orderBy, orderDir, page, thread_id).then((response) => {
    dispatch({

      type: ActionTypes.GET_PAI_MESSAGES_MSG_LIST_SUCCESS,
      payload: response,
    });
  })
    .catch(error => {

      dispatch({
        type: ActionTypes.GET_PAI_MESSAGES_MSG_LIST_FAILURE,
        payload: error.response ? `${error.response.status} ${error.response.statusText}` : {},
      });
    });

}

export function getPaiMessageThreads(
  {
    perPage,
    orderBy,
    orderDir,
    page,
    application,
    dispatch,
  }) {
  dispatch({
    type: ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_REQUEST,
  });

  return threads_get(perPage, orderBy, orderDir, page, application).then((response) => {
    dispatch({
      type: ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_SUCCESS,
      payload: response,
    });
    return response;
  })
    .catch(error => {

      dispatch({
        type: ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_FAILURE,
        payload: error.response ? `${error.response.status} ${error.response.statusText}` : {},
      });
    });

}

export function onReceiveChatMessage({event, dispatch}){
  try{
    dispatch({type: ActionTypes.ON_RECEIVE_PAI_MESSAGE_SUCCESS,
      payload: JSON.parse(event.data)
    })

  } catch (err){
    dispatch({type: ActionTypes.ON_RECEIVE_PAI_MESSAGE_FAILURE,
      payload: event.data,
      reason: err})
  }
}

export function onSwitchThreadAction({threadId, dispatch}) {
  return dispatch({type: ActionTypes.ON_PAI_MESSAGES_THREAD_SWITCH,
    payload: {}
  })
}
