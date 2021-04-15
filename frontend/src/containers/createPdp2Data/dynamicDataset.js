import React, { Component } from 'react';
import Select from '@material-ui/core/Select';
import { connect } from 'react-redux';
import MenuItem from '@material-ui/core/MenuItem';
import * as R from 'ramda';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/styles';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

import * as actions from './actions';
import { NEW_TEMPLATE_PATH } from './createTemplate';
import { Box } from '@material-ui/core';
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns'; // choose your lib
import { datasetTypes } from '../../common/constants';
import {DropzoneArea} from 'material-ui-dropzone'

const styles = theme => ({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'column',
    padding: '25px',
  },

  rowAligned: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    padding: '10px',
  },
  colAligned: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
  },
  createFieldForm: {
    display: 'flex',
    justifyContent: 'space-evenly',
    flexDirection: 'column',
  },
  createField: {
    display: 'flex',
    flex: 'flex-grow',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },

});


class DynamicDataset extends React.Component {

  constructor(props) {
    super(props);

    this.renderPrimitiveField = this.renderPrimitiveField.bind(this);
    this.renderFields = this.renderFields.bind(this);
    this.renderTemplateForm = this.renderTemplateForm.bind(this);
    this.state = { fields: {} };
  }


  renderPrimitiveField(field) {
    const { classes, indices } = this.props;
    const { fields } = this.state;
    let component = null;
    if (!('valueRef' in field)) {
      field.valueRef = React.createRef();
    }


    if (field.fieldType === datasetTypes.FIELD_TYPE_DATE) {
      const fieldKey = indices.join() + field.name;
      if (!(fieldKey in fields) && 'value' in field) {
        fields[fieldKey] = field.value;
      } else if (!(fieldKey in fields) && !('value' in field)) {
        fields[fieldKey] = new Date();
      }
      const onChange = (value) => {
        fields[fieldKey] = value;
        this.forceUpdate();
      };
      component = <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <DateTimePicker value={fields[fieldKey]}
                        inputRef={field.valueRef}
                        showTodayButton onChange={onChange}/>
      </MuiPickersUtilsProvider>;
    } else if (field.fieldType === datasetTypes.FIELD_TYPE_FILE ||
      field.fieldType === datasetTypes.FIELD_TYPE_VIDEO ||
      field.fieldType === datasetTypes.FIELD_TYPE_IMAGE) {

      const onChange = (value) => {
        const fieldKey = indices.join() + field.name;
        // value is already taken so using this as a hack
        field['valueActual'] = value;

        this.forceUpdate();
      };

      component = <DropzoneArea maxFiles={1}
                                // S3 only supports file sizes up to 2GB
                                maxFileSize={2000000000}
                                value={field.valueRef}
                                onChange={onChange}
                                ref={field.valueRef}/>
    } else {
      const onChange = () => {
        this.forceUpdate();
      };

      const getTextFieldComp = () => {
        if (field.valueRef.current) {
          return <TextField label={field.name} onChange={onChange} value={field.valueRef.current.value} type='search'
                            inputRef={field.valueRef}/>;
        } else if ('value' in field) {
          return <TextField label={field.name} onChange={onChange} value={field.value} type='search'
                            inputRef={field.valueRef}/>;
        } else {
          return <TextField label={field.name} onChange={onChange} type='search' inputRef={field.valueRef}/>;
        }
      };
      component = getTextFieldComp();


    }
    return <div className={classes.createField}>
      {component}
    </div>;
  };


  isEmpty(fields) {
    return (Object.keys(fields).length === 0 && fields.constructor === Object);
  }

  getKeys(fields) {
    return Object.keys(fields);
  }

  renderFields(fields) {
    const { indices, addDataToList, delItem, getSubSchema, classes, useDelHack } = this.props;

    if (this.isEmpty(fields)) {
      return;
    }

    const keys = this.getKeys(fields);
    const components = [];
    for (const key of keys) {
      if (!key.includes('field') || key === 'fieldType') {
        continue;
      }
      const field = fields[key];
      const fieldType = field.fieldType;
      if (fieldType !== datasetTypes.FIELD_TYPE_OBJECT && fieldType !== datasetTypes.FIELD_TYPE_LIST) {
        components.push(this.renderPrimitiveField(field));
      } else if (fieldType === datasetTypes.FIELD_TYPE_OBJECT) {
        components.push(<DynamicDataset indices={indices.concat(key)}
                                        getSubSchema={getSubSchema}
                                        formName={field.name}
                                        addDataToList={addDataToList}
                                        delItem={delItem}
                                        classes={classes}
                                        useDelHack={useDelHack}/>);
      } else if (fieldType === datasetTypes.FIELD_TYPE_LIST) {
        components.push(<ListDataset indices={indices.concat(key)}
                                     getSubSchema={getSubSchema}
                                     formName={field.name}
                                     addDataToList={addDataToList}
                                     delItem={delItem}
                                     classes={classes}
                                     useDelHack={useDelHack}/>);
      }
    }
    return components;
  };

  renderTemplateForm(subSchema) {
    const { classes } = this.props;


    return <div className={classes.root}>
      <Box border={1}>
        <Typography>{subSchema.name} </Typography>
        {this.renderFields(subSchema)}

      </Box>
    </div>;
  };

  render() {
    const { indices, getSubSchema } = this.props;
    const subSchema = getSubSchema(indices);
    return <div>
      {this.renderTemplateForm(subSchema)}
    </div>;

  }
}

class ListDataset extends DynamicDataset {

  constructor(props) {
    super(props);
    const { indices, getSubSchema } = this.props;
    const subSchema = getSubSchema(indices);
    // TODO remove hack to create childType
    this.state = { childType: subSchema.field1 };
    this.handleAddElementEvent = this.handleAddElementEvent.bind(this);
  }

  componentDidMount() {
    const { delItem, indices, useDelHack } = this.props;
    // TODO Remove hack to prevent child type from rendering before
    //  the user selects it
    //  THIS IS WHY IT RENDERS TWICE
    if (useDelHack) {
      delItem(indices, 'field1');
    }
  }

  isEmpty(fields) {
    return fields.length === 0;
  }

  clonedChildType(childType) {

    const cloned = {};
    const stack = [[childType, cloned]];
    while (stack.length > 0) {
      const els = stack.pop();
      const el = els[0];
      const cloned_el = els[1];
      const keys = Object.keys(el);
      for (const key of keys) {
        if (key.includes('field') && key !== 'fieldType') {
          const field = el[key];
          if (!(key in cloned_el)) {
            cloned_el[key] = {};
          }
          stack.push([field, cloned_el[key]]);
        } else if (key === 'valueRef') {
          cloned_el[key] = React.createRef();
        } else {
          cloned_el[key] = el[key];
        }
      }
    }
    return cloned;
  }


  handleAddElementEvent(event) {
    const { addDataToList, indices, fieldType } = this.props;
    const { childType } = this.state;
    addDataToList(indices, this.clonedChildType(childType));
  };


  render() {
    const { classes, datasetName, getSubSchema, indices } = this.props;
    const subSchema = getSubSchema(indices);
    const buttons = [];
    buttons.push(
      <Button align="inherit"
              variant="contained"
              onClick={this.handleAddElementEvent}>
        Add Field
      </Button>);

    return <div className={classes.root}>
      <Box border={1}>
        <Typography>{subSchema.name} </Typography>
        {this.renderFields(subSchema)}
        <div className={classes.rowAligned}>
          {buttons}
        </div>
      </Box>
    </div>;
  }
}


const mapStateToProps = ({ Pdp2Txns }) => ({ Pdp2Txns });

export default connect(mapStateToProps, actions)(withStyles(styles)(DynamicDataset));