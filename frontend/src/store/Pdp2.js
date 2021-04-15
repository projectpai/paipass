// actions keys
export const UPDATE_SUB_STATUS = 'UPDATE_SUB_STATUS';
export const UPDATE_PAYMENT_INFO = 'UPDATE_PAYMENT_INFO';
export const UPDATE_TORRENT_INFO = 'UPDATE_TORRENT_INFO';
export const UPDATE_PAYMENT_BYPASS = 'UPDATE_PAYMENT_BYPASS';
// action creators
export const actionUpdateSubStatus = sub_status => {
  // return UPDATE_SUB_STATUS action
  return {
    type: UPDATE_SUB_STATUS,
    payload: { pdp2_sub_status: sub_status },
  };
};


export const actionUpdatePaymentBypass = can_bypass_payment => {
  return {
    type: UPDATE_PAYMENT_BYPASS,
    payload: { can_bypass_payment: can_bypass_payment },
  };
};


export const actionUpdatePaymentInfo = (pub_key_addr, amount_requested) => {
  return {
    type: UPDATE_PAYMENT_INFO,
    payload: {
      pub_key_addr: pub_key_addr,
      amount_requested: amount_requested,
    },
  };
};

export const actionUpdateTorrentInfo = (uuid, txid, ref) => {
  return {
    type: UPDATE_TORRENT_INFO,
    payload: {
      uuid: uuid,
      txid: txid,
      ref: ref,

    },
  };
};


const initialState = {
  pdp2_sub_status: 'Inactive',
  pdp2_sub_active: false,
  can_bypass_payment: false,
  pub_key_addr: '',
  amount_requested: -1,
  uuid: '',
  txid: '',
  ref: '',

};

export const Pdp2Subscription = (state = initialState, { type, payload }) => {
  switch (type) {
    case UPDATE_SUB_STATUS:
      return {
        ...state,
        ...payload,
      };
    case UPDATE_PAYMENT_INFO:
      return {
        ...state,
        ...payload,
      };
    case UPDATE_TORRENT_INFO:
      return {
        ...state,
        ...payload,
      };


    case UPDATE_PAYMENT_BYPASS:
      return {
        ...state,
        ...payload,
      };

    // If we don't know the kind of action that occurred we return the previous
    // state and neglect the payload
    default:
      return state;
  }
};
