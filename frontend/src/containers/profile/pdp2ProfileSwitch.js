import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import {
  actionUpdateSubStatus,
  actionUpdatePaymentInfo,
  actionUpdateTorrentInfo,
  actionUpdatePaymentBypass, Pdp2Subscription,
} from '../../store/Pdp2';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InfoIcon from '@material-ui/icons/Info';
import { cond, is, equals, T, F } from 'ramda';

import './pdp2ProfileSwitch.scss';
import { Tooltip } from '../../components/shared/tooltip';
import { SCOPE_APPROVED, SCOPE_DENIED } from '../../entities/AuthorizeDetails';

import {
  URL_BASE,
} from '../../util';
import Button from '@material-ui/core/Button';

const switchStyle = () => ({
  switchBase: {
    height: 'auto',
  },
  iconChecked: {
    color: '#0098ff',
  },
});

const StyledSwitch = withStyles(switchStyle)(Switch);

class Pdp2ProfileSwitch extends React.Component {

  constructor(props) {

    super(props);
    this.onChangePdp2Status.bind(this);
    this.getSubscriptionStatus.bind(this);
    //this.bypassPayment.bind(this);
    const defaultChecked = cond([
      [equals(SCOPE_APPROVED), T],
      [equals(SCOPE_DENIED), F],
      [T, F],
    ]);
    this.state = {};
    this.getSubscriptionStatus();

  }

  componentDidMount() {
    const {
      pdp2_sub_status,
      pub_key_addr,
      amount_requested,
      uuid,
    } = this.props;

    if (uuid.length === 0 && pdp2_sub_status === 'Activated') {
      this.setOpReturnInfo();
    }
  }

  setOpReturnInfo() {
    this.props.accountService.get_pdp2_torrent_info().then((pdp2_info) => {
      this.props.updateTorrentInfo(
        pdp2_info.uuid,
        pdp2_info.txid,
        pdp2_info.ref,
      );
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      pdp2_sub_status,
      pub_key_addr,
      amount_requested,
      uuid,
      txid,
      can_bypass_payment,
      ref,
      status,
    } = this.props;
    this.setPaymentInfo(pdp2_sub_status, pub_key_addr, amount_requested);

    if (uuid.length === 0 && pdp2_sub_status === 'Activated') {
      this.setOpReturnInfo();
    }
  }

  render() {
    const {
      pdp2_sub_status,
      pub_key_addr,
      amount_requested,
      uuid,
      txid,
      can_bypass_payment,
      ref,
      status,
    } = this.props;

    let checked = this.getChecked(pdp2_sub_status);
    //const payment_info = this.renderPaymentInfo(pdp2_sub_status, pub_key_addr, amount_requested);
    if (pdp2_sub_status === 'Pending') {
    }
    return (
      <div className="mt-5 col-xl-4 ">

      <FormControlLabel
        className={`requested-item`}
        control={
          <StyledSwitch
            color="primary"
            name="PDP2"
            checked={checked}
            value={status}
          />
        }
        onChange={this.onChange}
        label={
          <div className="requested-scope text-left">
            <div>
              <b>PDP2 Profile Storage</b>
              <span>
                (from PAI Pass
                        <Tooltip title="This converts your profile to a PDP2 profile">
                  <InfoIcon/>
                </Tooltip>)
              </span>
              <div>
                <b>This permission allows your profile data to be stored in the PAI Coin
                  Blockchain.</b>
              </div>
            </div>
            <div><b><span>Status: {pdp2_sub_status}</span></b></div>
            {this.renderPaymentInfo(pdp2_sub_status, pub_key_addr, amount_requested)}
            {this.renderOpReturnInfo(pdp2_sub_status, uuid, txid)}
            {this.renderBypass(pdp2_sub_status, can_bypass_payment, pub_key_addr, amount_requested)}

          </div>
        }
      />
      </div>
    );

  }

  renderBypass(sub_status, can_bypass_payment, pub_key_addr, amount_requested) {
    if (!can_bypass_payment || sub_status !== 'Pending') {
      return;
    }
    this.setPaymentInfo();
    return <div>
      <Button onClick={() => this.bypassPayment(pub_key_addr, amount_requested)} variant="outlined" color="secondary"
              className="red mf-1">
        Bypass Payment
      </Button>
    </div>;
  }

  renderOpReturnInfo(sub_status, uuid, txid) {

    if (sub_status !== 'Activated') {
      return;
    }


    return [
      <div key={'blockchain_url_txid'}><p>
        The OP_RETURN transaction corresponding to your PDP2 profile storage can be found {' '}
        <a target="_blank" rel="noopener noreferrer" href={`https://paichain.info/ui/tx/${txid}`}>
          here
        </a>.
      </p>
      </div>,
      <div key={'pdp2_torrent_download'}>
        <a href={`${URL_BASE}/${process.env.REACT_APP_API_PDP2}get-torrent/`} download>Download PDP2 Torrent</a>
      </div>,
    ];
  }


  bypassPayment(pub_key_addr, amount_requested) {
    this.props.accountService.bypassPdp2Payment(pub_key_addr, amount_requested).then((pdp2_info) => {
      this.props.updateTorrentInfo(
        pdp2_info.uuid,
        pdp2_info.txid,
        pdp2_info.ref,
      );
      this.getSubscriptionStatus();

    });
  }

  getSubscriptionStatus() {
    this.props.accountService.get_pdp2_sub_status().then((pdp2_sub_info) => {
      this.props.updatePaymentBypass(pdp2_sub_info.can_bypass_payment);
      this.props.updateSubStatus(pdp2_sub_info.pdp2_sub_status);
    });
  }

  setPaymentInfo(pdp2_sub_status, pub_key_addr, amount_requested) {
    if (!(pdp2_sub_status === 'Pending' && amount_requested < 0)) {
      return;
    }

    if (this.props.pub_key_addr.length > 0) {
      return;
    }

    this.props.accountService.get_pdp2_payment_addr_info().then((payment_info) => {
      this.props.updatePaymentInfo(payment_info.pub_key_addr,
        payment_info.amount_requested);
    });
  }

  renderPaymentInfo(pdp2_sub_status, pub_key_addr, amount_requested) {
    if (amount_requested >= 0 && pdp2_sub_status === 'Pending') {
      return <span>Please pay {amount_requested / 100000000} PAI Coins to {pub_key_addr}</span>;
    } else {
      return;
    }
  }

  getChecked(pdp2_sub_status) {
    let checked = false;
    if (pdp2_sub_status === '') {
      checked = false;
    } else if (pdp2_sub_status === 'Activated' || pdp2_sub_status === 'Pending') {
      checked = true;
    } else {
      checked = false;
    }
    return checked;
  }

  onChange = e => {
    const checked = !this.state.checked;
    //this.setState({ checked });
    this.onChangePdp2Status();
  };

  onChangePdp2Status() {
    const {
      pdp2_sub_status,
    } = this.props;
    if (pdp2_sub_status === 'Inactive') {
      this.props.accountService.generate_pdp2_payment_addr().then((payment_info) => {
        this.props.updatePaymentInfo(payment_info.pub_key_addr,
          payment_info.amount_requested);
        this.getSubscriptionStatus();

      });
    } else if (pdp2_sub_status === 'Pending' || pdp2_sub_status === 'Activated') {
      this.props.accountService.change_pdp2_activation_status('deactivate').then(pdp2_sub => {
        this.props.updateSubStatus(pdp2_sub.pdp2_sub_status);
        this.getSubscriptionStatus();

      });
    } else if (pdp2_sub_status === 'User Deactivated' || pdp2_sub_status === 'Deactivated') {
      this.props.accountService.change_pdp2_activation_status('activate').then(pdp2_sub => {
        this.props.updateSubStatus(pdp2_sub.pdp2_sub_status);
        this.getSubscriptionStatus();

      });
    }
  };
}


const mapStateToProps = state => {
  const {
    Pdp2Subscription,
  } = state;

  return {
    pdp2_sub_status: Pdp2Subscription.pdp2_sub_status,
    pub_key_addr: Pdp2Subscription.pub_key_addr,
    amount_requested: Pdp2Subscription.amount_requested,
    uuid: Pdp2Subscription.uuid,
    txid: Pdp2Subscription.txid,
    ref: Pdp2Subscription.ref,
    can_bypass_payment: Pdp2Subscription.can_bypass_payment,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    updateTorrentInfo(uuid, txid, ref) {
      dispatch(actionUpdateTorrentInfo(uuid, txid, ref));
    },

    updateSubStatus(pdp2_sub_status) {
      dispatch(actionUpdateSubStatus(pdp2_sub_status));
    },

    updatePaymentInfo(pub_key_addr, amount_requested) {
      dispatch(actionUpdatePaymentInfo(pub_key_addr, amount_requested));
    },

    updatePaymentBypass(can_bypass_payment) {
      dispatch(actionUpdatePaymentBypass(can_bypass_payment));
    },

  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Pdp2ProfileSwitch);
