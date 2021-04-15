import { ActionTypes } from '../../common/constants';
import createTree from 'functional-red-black-tree';

function defaultCompare(a, b) {
  if(a > b) {
    return -1
  }
  if(a < b) {
    return 1
  }
  return 0
}

const defaultStatePaiMessages = {
  fetching: false,
  messages: createTree(defaultCompare),
  count: 0,
  self: '',
  prev: null,
  next: null,
};

const defaultStatePaiThreads = {
  fetching: false,
  data: [],
  count: 0,
};
const draw = 0;

const insertMsgs = (data, msgs) => {
  let endTree = data;
  msgs.forEach(msg => {
    endTree = endTree.insert(msg.sent_at, msg);
  });
  return endTree;
};

const insertMsg = (data, msg) => {
  return data.insert(msg.sent_at, msg);
};

export const PaiMessages = (state = defaultStatePaiMessages, action) => {
  const { messages, count } = state;
  let modMsgs = null;
  switch (action.type) {
    case ActionTypes.GET_PAI_MESSAGES_MSG_LIST_REQUEST:
      return { ...state, fetching: true };

    case ActionTypes.GET_PAI_MESSAGES_MSG_LIST_SUCCESS:
      modMsgs = insertMsgs(messages, action.payload.results);
      return {
        ...state,
        draw: draw + 1,
        messages: modMsgs,
        count: count + action.payload.count,
        next: action.payload.next,
        prev: action.payload.prev,
        fetching: false,
        // Paicoin address for the user making the request
        self: action.payload.self,
      };
    case ActionTypes.ON_PAI_MESSAGES_THREAD_SWITCH:
      return defaultStatePaiMessages;

    case ActionTypes.GET_PAI_MESSAGES_MSG_LIST_FAILURE:
      return { ...state, fetching: false };
    case ActionTypes.ON_RECEIVE_PAI_MESSAGE_SUCCESS:
      modMsgs = insertMsg(messages, action.payload);
      return {
        ...state,
        draw: draw + 1,
        messages: modMsgs,
        count: action.payload.count,
        fetching: false,
      };

    default:
      return { ...state };
  }

};

const getThreadName = (threadNameSuggestion, recipients) => {
  if (threadNameSuggestion.length > 0) {
    return threadNameSuggestion;
  }

  const minRepr = (recipient) => recipient.representation.slice(-5)
  let threadName = '';
  let suffix = '';
  if (recipients.length === 2) {
    return minRepr(recipients[0]) + ' and ' + minRepr(recipients[1]);
  }
 for (const [index, recipient] of recipients.entries()) {
    if (index === (recipients.length - 2)) {
      suffix = ', and ';
    } else if (index === (recipients.length - 1)) {
      suffix = '';
    } else {
      suffix = ', ';
    }
    threadName += minRepr(recipient) + suffix;
  }

  return threadName;
};


export const PaiMessageThreads = (state = defaultStatePaiThreads, action) => {
  switch (action.type) {
    case ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_REQUEST:
      return { ...state, fetching: true };

    case ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_SUCCESS:
      for (const thread of action.payload.results){
        thread.name = getThreadName(thread.name, thread.recipients);
      }
      return {
        ...state,
        draw: draw + 1,
        data: action.payload.results,
        count: action.payload.count,
        fetching: false,
      };

    case ActionTypes.GET_PAI_MESSAGES_THREAD_LIST_FAILURE:
      return { ...state, data: [], fetching: false };

    default:
      return { ...state };
  }

};

