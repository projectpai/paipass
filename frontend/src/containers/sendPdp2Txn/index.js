import React, { Fragment } from 'react';
import TextField from '@material-ui/core/TextField';
import './sendPdp2Data.scss';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import * as R from 'ramda';
import { ToastsContainer, ToastsStore } from 'react-toasts';
import { Select } from '@material-ui/core';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import { withStyles } from '@material-ui/styles';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import {DateTimePicker} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';

const styles = theme => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 240,
  }, rowAligned: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
    padding: '10px',
  },

});


const DATASET_TYPE_PROFILE = 'PROFILE_DATA';
const DATASET_TYPE_DATASET = 'DATASET';

class SendPdp2DataForm extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      pub_key_addr: '',
      pub_key: '',
      selectedDatasetId: (props.preselectedDatasetId) ? props.preselectedDatasetId : null,
      selectedDatasetType: (props.preselectedDatasetType) ? props.preselectedDatasetType : '',
      selectedDatasetTypeRef: React.createRef(),
      variantRefs: { count: 0 },
      encryptionValue: 'unencrypted',
      areVariantsLoading: true,
    };

    this.onDatasetTypeSelected = this.onDatasetTypeSelected.bind(this);
    this.renderVariantComponents = this.renderVariantComponents.bind(this);
    this.addVariantRef = this.addVariantRef.bind(this);
    this.handleRadioGroupChange = this.handleRadioGroupChange.bind(this);
    this.renderPublicEncryptionKeyField = this.renderPublicEncryptionKeyField.bind(this);
    //this.getVariantRef = this.getVariantRef.bind(this);
  }

  handleRadioGroupChange = (event) => {
    this.setState({ encryptionValue: event.target.value });
  };

  renderRadioGroup() {
    const { encryptionValue } = this.state;
    // TODO This doesn't actually work the way it should. It forces it to work
    // by probably breaking the parent css value of color. Without this,
    // part of the selected radio button will disappear
    const color = '#1590ea';
    return (
      <FormControl component="fieldset">
        <FormLabel component="legend">Encryption</FormLabel>
        <RadioGroup aria-label="gender" name="encryptionRadioGroup" value={encryptionValue}
                    onChange={this.handleRadioGroupChange}>
          <FormControlLabel value="encrypted" control={<Radio color={color}/>} label="Encrypted"/>
          <FormControlLabel value="unencrypted" control={<Radio color={color}/>} label="Unencrypted"/>
        </RadioGroup>
      </FormControl>

    );
  }

  renderPublicEncryptionKeyField() {
    const { encryptionValue, pub_key } = this.state;
    if (encryptionValue === 'unencrypted')
      return;
    return <div className="d-flex align-items-center">
      <TextField
        label="Public Key"
        type="text"
        name="pub_key"
        margin="normal"
        variant="outlined"
        value={pub_key}
        onChange={this.onFormChange('pub_key')}
        //error={this.hasError('fullname')}
        fullWidth
      />
    </div>;
  }


  render() {
    const { pub_key_addr, pub_key, selectedDatasetType, selectedDatasetTypeRef } = this.state;
    const { classes } = this.props;

    return (

      <div className="container-fluid send-pdp2-rt">
        <div className="row justify-content-center align-items-center flex-column">
          <Fragment>

            <div className="col-xl-4 col-sm-8">
              <div className="form">
                <div className={classes.rowAligned}>
                  <Typography variant='h3'>Send Your Data via the PAI Coin Blockchain</Typography>

                  <FormControl className={classes.formControl}>
                    <InputLabel>Dataset Type</InputLabel>
                    <Select inputRef={selectedDatasetTypeRef}
                            onChange={this.onDatasetTypeSelected}
                            value={selectedDatasetType}>
                      <MenuItem value={DATASET_TYPE_PROFILE}>Profile Data</MenuItem>
                      <MenuItem value={DATASET_TYPE_DATASET}>Dataset</MenuItem>
                    </Select>
                  </FormControl>
                  {this.renderVariantComponents()}

                  <TextField
                    label="PAI Coin Address"
                    type="text"
                    name="pub_key_addr"
                    margin="normal"
                    variant="outlined"
                    value={pub_key_addr}
                    onChange={this.onFormChange('pub_key_addr')}
                    //error={this.hasError('fullname')}
                    fullWidth
                  />
                  {this.renderRadioGroup()}

                  {this.renderPublicEncryptionKeyField()}

                </div>
              </div>
            </div>
            <div className="mt-5 col-xl-4 col-sm-8 text-center">
              <Button
                variant="outlined"
                color="primary"
                className="primary mb-1"
                onClick={this.onSend}
                fullWidth
              >
                Send Data
              </Button>
              <Button
                onClick={this.onClear}>
                Clear Data
              </Button>
            </div>
          </Fragment>
          <ToastsContainer store={ToastsStore}/>

        </div>

      </div>);

  }

  onDatasetTypeSelected(event) {
    this.setState({ selectedDatasetType: event.target.value });
  }

  addVariantRef(name) {
    const { variantRefs } = this.state;
    variantRefs['field' + variantRefs.count] = {
      'ref': React.createRef(),
      'name': name,
    };
    const variantRef = variantRefs['field' + variantRefs.count];
    variantRefs.count += 1;
    return variantRef;
  }

  renderDatasetComponents() {
    const { selectedDatasetId, variantRefs } = this.state;

    const components = [];
    let vref = null;
    // TODO: Remove hack!!!
    if ('field0' in variantRefs && variantRefs.field0.name === 'dataset_id') {

      vref = variantRefs.field0;

    } else {
      vref = this.addVariantRef('dataset_id');
    }
    components.push(
      <TextField label="Dataset ID" type={'search'} value={selectedDatasetId} inputRef={vref.ref}/>,
    );
    return components;
  }

  renderVariantComponents() {
    const { selectedDatasetType } = this.state;

    const components = [];
    if (selectedDatasetType === DATASET_TYPE_DATASET) {
      return this.renderDatasetComponents();
    } else if (selectedDatasetType === DATASET_TYPE_PROFILE) {
      return components;
    } else {
      return components;
    }

  }

  onFormChange = form => ({ target: { value } }) =>
    this.setState({ [form]: value, errorMessage: false });

  fillValues(variantRefs, variantValues) {
    const stack = [[variantRefs, variantValues]];
    while (stack.length > 0) {
      const [variantRef, variantValue] = stack.pop();
      const keys = Object.keys(variantRef);
      for (const key of keys) {
        if (key.includes('field')) {
          variantValue[key] = {};
          stack.push([variantRef[key], variantValue[key]]);
        } else if (key.includes('ref')) {
          variantValue['value'] = variantRef[key].current.value;
        } else {
          variantValue[key] = variantRef[key];
        }
      }

    }
    return variantValues;
  }

  onSend = () => {
    const { selectedDatasetTypeRef, variantRefs, encryptionValue } = this.state;
    const variantValues = this.fillValues(variantRefs,
      { selectedDatasetType: selectedDatasetTypeRef.current.value });

    this.props.accountService.send_pdp2_data(this.state.pub_key_addr,
      this.state.pub_key,
      variantValues, encryptionValue)
      .then(response => {
        if (response && response.hasOwnProperty('errors')) {
          ToastsStore.error('One of the submitted parameters is incorrect');
        } else {
          ToastsStore.success('Your data has been sent!');
        }
      });

  };

  onClear = () => {
    this.setState({
      pub_key_addr: '',
      pub_key: '',
    });
  };
}

export default withStyles(styles)(SendPdp2DataForm);