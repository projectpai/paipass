import React, { Component } from 'react';
import Select from '@material-ui/core/Select';
import { connect } from 'react-redux';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import * as R from 'ramda';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import { v4 as uuidv4 } from 'uuid';

import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { parse } from 'date-fns';
import * as actions from './actions';

import DynamicDataset from './dynamicDataset';

import './createData.scss';
import { datasetTypes } from '../../common/constants';


const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',

  },
  child: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    alignContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    margin: theme.spacing(0.75),
  },
  uploadProgress:{
    display: 'flex',
    flexDirection: 'row',
    ".item:nth-child(2n)" :{
       breakAfter: "always",
    }
  },
  divider: {
    padding: '20px',
  },
  savedTemplate: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
  },
});


const NEW_DATASET_PATH = 'NEW_DATASET_PATH';

function calcUpProg(filePendingUpload, fileSize) {
  const amountUploaded = filePendingUpload['amount_uploaded'];
  const numPasses = filePendingUpload['num_passes'];
  return 100 * amountUploaded / (fileSize * numPasses);
}


class CreateDataset extends Component {
  constructor(props) {
    super(props);

    this.state = {
      path: null,
      schemas: [],
      dataset: { 'name': 'Loading Template...' },
      fields: [],
      filesPendingUpload: {},
      lastSession: null,
      datasetIdPendingUpload: null,
      refreshIntervalId: null,
      fileSizes: {},

    };
    this.retrieveSchemaStruct = this.retrieveSchemaStruct.bind(this);
    this.getSubDataset = this.getSubDataset.bind(this);
    this.addDataToList = this.addDataToList.bind(this);
    this.delItem = this.delItem.bind(this);
    this.getUploadProgress = this.getUploadProgress.bind(this);
  };


  componentDidMount() {
    const { accountService, activeStep, selectedSchema } = this.props;
    if (activeStep === 0) {
      accountService.getSchemas().then((res) => {
        this.setState({ schemas: res.schemas });
      });
    } else if (activeStep == 1) {

    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { activeStep } = this.props;
    const { datasetIdPendingUpload, refreshIntervalId } = this.state;

    if (activeStep !== 1) {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        this.setState({ refreshIntervalId: null });
      }
      return;
    }

    if (datasetIdPendingUpload && !refreshIntervalId) {
      const refreshIntervalId = setInterval(this.getUploadProgress, 500);
      this.setState({ refreshIntervalId: refreshIntervalId });
    } else if (!datasetIdPendingUpload && refreshIntervalId) {
      clearInterval(refreshIntervalId);
      this.setState({ refreshIntervalId: null });
    }

  }


  render() {
    const { classes, activeStep } = this.props;
    if (activeStep === 0) {
      return this.getInitialState(classes);
    } else if (activeStep === 1) {
      this.retrieveSchemaStruct();
      return this.getCreateDatasetState();
    } else if (activeStep === 2) {
      return this.getSuccess();
    }

  }

  retrieveSchemaStruct() {
    const { accountService, selectedSchema } = this.props;
    const { dataset } = this.state;
    if ('field1' in dataset) return;

    accountService.getSchema(selectedSchema).then((res) => {
      const datasets = [res];
      while (datasets.length > 0) {
        const subdataset = datasets.pop();
        const keys = Object.keys(subdataset);
        for (const key of keys) {
          if (!key.includes('field') || key === 'fieldType') {
            continue;
          }
          const field = subdataset[key];
          const fieldType = field.fieldType;
          if (fieldType === datasetTypes.FIELD_TYPE_OBJECT || fieldType === datasetTypes.FIELD_TYPE_LIST) {
            datasets.push(field);
          } else {
            field['valueRef'] = React.createRef();
          }

        }
      }
      this.setState({ 'dataset': res });
    });

  }

  getInitialState(classes) {
    const { schemas } = this.state;
    const { activeStep, onStepChange, onSchemaSelected, selectedSchema } = this.props;
    const renderMenuItems = () => {
      const comps = [];

      schemas.forEach(schema => {
          const comp = <MenuItem value={schema.id}>{schema.name}</MenuItem>;
          comps.push(comp);
        },
      );
      return comps;
    };

    const schemaSelectedEvent = (event) => {
      onSchemaSelected(event.target.value);
    };

    const onClick = (event) => {
      onStepChange(NEW_DATASET_PATH, activeStep + 1);
    };

    return <div className={classes.savedTemplate}>
      <FormControl className={classes.formControl}>
        <InputLabel required>Templates</InputLabel>
        <Select value={selectedSchema} onChange={schemaSelectedEvent}>
          {renderMenuItems()}
        </Select>
      </FormControl>

      <Button align="inherit" variant="contained" disabled={selectedSchema.length < 1} onClick={onClick}>Create
        Dataset</Button>
    </div>;
  }

  getSubDataset(indices) {
    const reducer = (accumulator, currentValue) => accumulator[currentValue];
    let obj = indices.reduce(reducer, this.state);
    return obj;

  }

  addDataToList(indices, field) {
    const dataset = this.getSubDataset(indices);
    dataset.count += 1;
    dataset['field' + dataset.count] = field;
    this.setState({ dataset: this.state.dataset });
  }

  delItem(indices, name) {
    const dataset = this.getSubDataset(indices);
    dataset.count -= 1;
    delete dataset[name];
    this.setState({ dataset: this.state.dataset });
  }


  getUploadProgress() {
    const { datasetIdPendingUpload, fileSizes, lastSession } = this.state;
    const { accountService } = this.props;

    if (lastSession) {
      return;
    }

    this.setState({lastSession: {inUse:true}})

    accountService.getUploadProgress(datasetIdPendingUpload).then(
      (filesPendingUpload) => {
        const keys = Object.keys(filesPendingUpload);
        for (const key of keys) {
          if (!key.startsWith('file_')){
            continue;
          }
          const fileSize = fileSizes[key];
          const filePendingUpload = filesPendingUpload[key];
          const percUploaded = calcUpProg(filePendingUpload, fileSize);
          if (percUploaded >= 100 || percUploaded <= 0) {
            delete filesPendingUpload[key]
          }
        }

        this.setState({ lastSession:null,
          filesPendingUpload: filesPendingUpload });
      },
    );
  }

  getCreateDatasetState() {
    const { filesPendingUpload, dataset, fileSizes } = this.state;
    const { selectedSchema, classes, activeStep, onStepChange, accountService } = this.props;


    const renderFields = (fields) => {
      if (fields.length === 0) {
        return <div/>;
      }
      return R.map(field => (
        <div className={classes.child}>
          <Typography gutterBottom align="center" variant="h6">
            {field[0]}:
          </Typography>
          <TextField label="Value" type={'search'} inputRef={field[1]}/>
        </div>
      ))(fields);
    };

    const handleCreateDatasetEvent = (event) => {
      dataset['id'] = selectedSchema;
      const stack = [dataset];
      const fylesStruct = {};
      dataset['uuid'] = uuidv4();

      while (stack.length > 0) {
        const subdataset = stack.pop();
        const keys = Object.keys(subdataset);
        for (const key of keys) {
          if (!key.includes('field') || key === 'fieldType') {
            continue;
          }
          const field = subdataset[key];
          const fieldType = field.fieldType;
          if ('valueRef' in field) {
            if (fieldType === datasetTypes.FIELD_TYPE_DATE) {
              const parsed = parse(field.valueRef.current.value, 'MMMM do hh:mm aaaa', new Date());
              field['value'] = parsed.toISOString();
            } else if (field.fieldType === datasetTypes.FIELD_TYPE_FILE ||
              field.fieldType === datasetTypes.FIELD_TYPE_VIDEO ||
              field.fieldType === datasetTypes.FIELD_TYPE_IMAGE) {

              // For the sake of being self documenting; I already deleted this
              // once because I didn't realize that what comes from the dropzone
              // and thus field['valueActual'] is an array of files
              const fyles = field['valueActual'];
              field['value'] = uuidv4();

              for (const fyle of fyles) {
                // r* and the chars thereafter allow the django backend to uniquely
                // identify this file upload set and will allow us
                // to make a GET request with the corresponding r* id
                const uid = 'file_' + Object.keys(fylesStruct).length + '_' + field['value'] + 'r*' + dataset['uuid'];
                fylesStruct[uid] = fyle;
                fileSizes[uid] = fyle.size;

              }

            } else {
              field['value'] = field.valueRef.current.value;
            }
            delete field.valueRef;
          } else if (fieldType === datasetTypes.FIELD_TYPE_OBJECT || fieldType === datasetTypes.FIELD_TYPE_LIST) {
            stack.push(field);
          }
        }
      }
      this.setState({ datasetIdPendingUpload: dataset['uuid'] });
      accountService.createDataset(dataset, fylesStruct).then(
        () => {
          onStepChange(NEW_DATASET_PATH, activeStep + 1);
        },
      );
    };

    let dd = null;
    if ('field1' in dataset) {
      dd = <DynamicDataset indices={['dataset']}
                           getSubSchema={this.getSubDataset}
                           formName={dataset.name}
                           addDataToList={this.addDataToList}
                           delItem={this.delItem}
                           classes={classes}
                           useDelHack/>;
    }
    const progressComponents = [];
    const keys = Object.keys(filesPendingUpload);
    for (const key of keys) {
      if (!key.startsWith('file_')){
        continue;
      }
      const fileSize = fileSizes[key];
      const filePendingUpload = filesPendingUpload[key];
      progressComponents.push(<Typography>
        {key}
      </Typography> )
      progressComponents.push(<CircularProgress
        variant="static"
        value={calcUpProg(filePendingUpload, fileSize)}/>);

    }

    return <div>
      <div className={classes.uploadProgress}>
        {progressComponents}
      </div>
      {dd}
      <Button align="inherit"
              variant="contained"
              onClick={handleCreateDatasetEvent}>
        Create Dataset
      </Button>
    </div>;
  }

  getSuccess() {
    const { onStepChange } = this.props;
    const handleReturn = () => {
      onStepChange(null, 0);
    };

    return <div>
      <Typography gutterBottom align="inherit" variant="h5">
        You Successfully Created the Dataset!
      </Typography>
      <Button align="inherit"
              variant="contained"
              onClick={handleReturn}>

        Return to Dataset Creator
      </Button>
    </div>;

  }
}

const mapStateToProps = ({ UploadedFilesInProgress }) => ({ UploadedFilesInProgress });

export default connect(mapStateToProps, actions)(withStyles(styles)(CreateDataset));

