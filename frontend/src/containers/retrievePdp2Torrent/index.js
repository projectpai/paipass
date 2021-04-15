import React, { Fragment } from 'react';
import TextField from '@material-ui/core/TextField';
import './retrievePdp2Torrent.scss';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import {ToastsContainer, ToastsStore} from 'react-toasts';
import { URL_BASE } from '../../util';


class RetrievePdp2Data extends React.Component {
  state = {
    txid: '',
    torrent_uuid: '',
  };

  render() {
    const { txid } = this.state;

    return <div className="container-fluid retrieve-pdp2-torrent-rt">
      <Typography variant='h3'>Retrieve a Torrent Listed on the Paicoin Blockchain</Typography>
      <div className="row justify-content-center align-items-center flex-column">
        <Fragment>
          <div className="mt-5 col-xl-4 col-sm-8">
            <div className="form">
              <div>
                <TextField
                  label="Transaction ID"
                  type="text"
                  name="txid"
                  margin="normal"
                  variant="outlined"
                  value={txid}
                  onChange={this.onFormChange('txid')}
                  //error={this.hasError('fullname')}
                  fullWidth
                />

              </div>
            </div>
          </div>
          <div className="mt-5 col-xl-4 col-sm-8 text-center">
            <Button
              variant="outlined"
              color="primary"
              className="primary mb-1"
              onClick={this.onSend}
              disabled={this.state.txid.length < 12}
              fullWidth
            >
              Find Torrent
            </Button>
            {this.renderDownloadButton()}
          </div>
        </Fragment>
        <ToastsContainer store={ToastsStore}/>

      </div>
    </div>;
  }

  renderDownloadButton(){
    if (this.state.torrent_uuid === ''){
      return
    }
    return <a href={`${URL_BASE}/${process.env.REACT_APP_API_PDP2}get-torrent/${this.state.torrent_uuid}/`} download>Download Torrent</a>
  }

  onFormChange = form => ({ target: { value } }) =>
    this.setState({ [form]: value, errorMessage: false });

  onSend = () => {
    this.props.accountService.retrieve_pdp2_torrent_uuid_from_txid(this.state.txid)
      .then(response => {
        if (response && response.hasOwnProperty('errors')) {
          ToastsStore.error('One of the submitted parameters is incorrect')
        } else {
          this.setState({torrent_uuid: response.torrent_uuid})
        }
      });

  };
}

export default RetrievePdp2Data;