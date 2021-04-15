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
import {datasetTypes} from '../../common/constants'


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




class DynamicTemplate extends React.Component {

  constructor(props) {
    super(props);
    this.handleAddFieldEvent = this.handleAddFieldEvent.bind(this);
    this.handleAddObjectEvent = this.handleAddObjectEvent.bind(this);
    this.handleAddListEvent = this.handleAddListEvent.bind(this);
    this.renderPrimitiveField = this.renderPrimitiveField.bind(this);
    this.renderFields = this.renderFields.bind(this);
    this.renderTemplateForm = this.renderTemplateForm.bind(this);
  }

  componentDidMount() {
    const { addObjNameRef, indices } = this.props;
    addObjNameRef(indices, React.createRef());
  }

  handleAddFieldEvent(event) {
    const { addField, indices } = this.props;
    const name = React.createRef();
    const selectedFieldType = React.createRef();
    const field = {
      'name': name,
      'selectedFieldType': selectedFieldType,
      'fieldType': datasetTypes.FIELD_TYPE_PRIMITIVE,
    };
    addField(indices, field);
  };

  handleAddObjectEvent(event) {
    const { addField, indices } = this.props;
    const field = {
      'name': '',
      'fieldType': datasetTypes.FIELD_TYPE_OBJECT,
      'count': 0,
    };
    addField(indices, field);
  };

  handleAddListEvent(event) {
    const { addField, indices } = this.props;
    const name = React.createRef();
    const field = {
      'name': name,
      'fieldType': datasetTypes.FIELD_TYPE_LIST,
      count: 0,
    };
    addField(indices, field);
  };


  renderPrimitiveField(field) {
    const { classes } = this.props;
    return <div className={classes.createField}>
      <TextField label="Field Name" type='search' inputRef={field.name}/>
      <FormControl className={classes.formControl}>
        <InputLabel>Field Type</InputLabel>
        <Select inputRef={field.selectedFieldType}>
          <MenuItem value="Text">Text Field</MenuItem>
          <MenuItem value="Date">Date Field</MenuItem>
          <MenuItem value="File">File Field</MenuItem>
          <MenuItem value="Image">Image Field</MenuItem>
          <MenuItem value="Video">Video Field</MenuItem>
        </Select>
      </FormControl>
    </div>;
  };


  isEmpty(fields){
    return (Object.keys(fields).length === 0 && fields.constructor === Object);
  }

  getKeys(fields){
    return Object.keys(fields);
  }

  renderFields(fields) {
    const { indices, addField, getSubSchema, addObjNameRef, classes } = this.props;

    if (this.isEmpty(fields)){
      return;
    }

    const keys = this.getKeys(fields)
    const components = [];
    for (const key of keys) {
      if (!key.includes('field')) {
        continue;
      }
      const field = fields[key];
      const fieldType = field.fieldType;
      if (fieldType === datasetTypes.FIELD_TYPE_PRIMITIVE) {
        components.push(this.renderPrimitiveField(field));
      } else if (fieldType === datasetTypes.FIELD_TYPE_OBJECT) {
        components.push(<DynamicTemplate indices={indices.concat(key)}
                                         getSubSchema={getSubSchema}
                                         formName={'Object'}
                                         addField={addField}
                                         addObjNameRef={addObjNameRef}
                                         classes={classes}/>);
      } else if (fieldType === datasetTypes.FIELD_TYPE_LIST) {
        components.push(<ListField indices={indices.concat(key)}
                                   getSubSchema={getSubSchema}
                                   formName={'List'}
                                   addField={addField}
                                   addObjNameRef={addObjNameRef}
                                   classes={classes}/>);
      }
    }
    return components;
  };

  renderTemplateForm(subSchema) {
    const { classes, formName } = this.props;


    return <div className={classes.root}>
      <Box border={1}>
        <TextField label={formName + ' Name'} type='search' inputRef={subSchema.name}/>
        {this.renderFields(subSchema)}

        <div className={classes.rowAligned}>
          <Button align="inherit"
                  variant="contained"
                  onClick={this.handleAddFieldEvent}>
            Add Field
          </Button>
          <Button align="inherit"
                  variant="contained"
                  onClick={this.handleAddObjectEvent}>
            Add Object
          </Button>
          <Button align="inherit"
                  variant="contained"
                  onClick={this.handleAddListEvent}>
            Add List
          </Button>
        </div>
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

class ListField extends DynamicTemplate {

  isEmpty(fields){
    return fields.length === 0;
  }


  render() {
    const { classes, formName, getSubSchema, indices } = this.props;
    const subSchema = getSubSchema(indices);
    const buttons = [];
    if (subSchema.count < 1) {
      buttons.push(
        <Button align="inherit"
                variant="contained"
                onClick={this.handleAddFieldEvent}>
          Add Field
        </Button>);
      buttons.push(
        <Button align="inherit"
                variant="contained"
                onClick={this.handleAddObjectEvent}>
          Add Object
        </Button>);
    }

    return <div className={classes.root}>
      <Box border={1}>
        <TextField label={formName + ' Name'} type='search' inputRef={subSchema.name}/>
        {this.renderFields(subSchema)}
        <div className={classes.rowAligned}>
          {buttons}


        </div>
      </Box>
    </div>;
  }
}


const mapStateToProps = ({ Pdp2Txns }) => ({ Pdp2Txns });

export default connect(mapStateToProps, actions)(withStyles(styles)(DynamicTemplate));