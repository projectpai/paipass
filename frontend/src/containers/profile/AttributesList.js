import React, { Component } from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListSubheader from '@material-ui/core/ListSubheader';
import IconButton from '@material-ui/core/IconButton';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Divider from '@material-ui/core/Divider';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as R from 'ramda';
import {
  deleteAttributeValue,
  setEditing,
  updateValue,
  addNewValue,
  SaveNewValue,
  setError,
} from 'store/Values';
import { connect } from 'react-redux';
import Delete from '@material-ui/icons/DeleteOutlined';
import Edit from '@material-ui/icons/Edit';
import Done from '@material-ui/icons/Done';
import Info from '@material-ui/icons/Info';
import Clear from '@material-ui/icons/Clear';
import Add from '@material-ui/icons/Add';
import TextField from '@material-ui/core/TextField';
import { Tooltip } from 'components/shared/tooltip';
import Select from '@material-ui/core/Select';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import MenuItem from '@material-ui/core/MenuItem';
import classnames from 'classnames';

const actions = {
  deleteAttributeValue,
  setEditing,
  updateValue,
  addNewValue,
  SaveNewValue,
  setError,
};

class AttributesList extends Component {
  state = {};
  render() {
    const { classes, attributes = {}, values = {}, namespace } = this.props;
    if (R.isEmpty(attributes)) return null;
    const content = attributes.map(attribute => {
      if (!attribute.editable && R.isEmpty(attribute.idValues || []))
        return null;
      return (
        <li key={`section-${attribute.name}`} className={classes.listSection}>
          <ul className={classes.ul}>
            <ListSubheader className="text-center subHeading">
              <ListItem key={`header-${attribute.name}`}>
                {attribute.label || attribute.name}
                <ListItemSecondaryAction>
                  {this.addCreateBtn(attribute)}
                </ListItemSecondaryAction>
              </ListItem>
            </ListSubheader>
            {attribute.idValues.map(id => {
              return (
                <ListItem
                  button
                  classes={{ button: classes.button }}
                  key={`item-${attribute.name}-${id}`}
                >
                  {this.renderItem(values, attribute, id, namespace)}
                </ListItem>
              );
            })}
          </ul>
        </li>
      );
    });

    return (
      <>
        <List className={classNames(classes.root, 'mt-5')} subheader={<li />}>
          {content}
        </List>
        {this.renderErrorMessage()}
      </>
    );
  }

  renderErrorMessage = () => (
    <>
      <Divider
        className={classnames('mt-3', 'mb-3')}
        style={{ display: this.props.errorMessage ? null : 'none' }}
      />
      <div
        className={classnames('error-message', 'p-3', 'text-center', {
          show: !!this.props.errorMessage,
        })}
      >
        <span>{this.props.errorMessage}</span>
      </div>
    </>
  );
  addCreateBtn(attribute) {
    if (attribute.maxValues > attribute.idValues.length && attribute.editable) {
      const number = attribute.idValues.length + 1;
      return (
        <IconButton
          aria-label="Add"
          onClick={this.onHandleAddValue(attribute.id, number)}
        >
          <Add color="primary" />
        </IconButton>
      );
    }
  }
  onHandleAddValue = (id, number) => () => {
    this.props.addNewValue(id, number);
  };

  onHandleDelete = (idAttr, idValue, namespace, keyName) => () => {
    if (window.confirm('Are you sure you want to delete this value?'))
      this.props.deleteAttributeValue(idAttr, idValue, namespace, keyName);
  };
  onHandleEdit = (idAttr, idValue) => () => {
    this.props.setEditing(idAttr, idValue);
  };

  onHandleCancel = (idAttr, idValue) => () => {
    this.props.setEditing(idAttr, idValue);
  };

  onHandleSelectCancel = (idAttr, idValue) => () => {
    this.setState({ [`value-${idValue}`]: null });
    this.props.setEditing(idAttr, idValue);
  };

  onHandleUpdate = (id, namespace, keyName) => () => {
    const { value = '' } = this[`${id}`];
    this.props.updateValue(id, value, namespace, keyName);
  };

  onHandleSave = (idAttr, id, namespace, keyName) => () => {
    const { value = '' } = this[`${id}`];
    this.props.SaveNewValue(idAttr, id, value, namespace, keyName);
  };

  onHandleSelectUpdate = (id, namespace, keyName) => () => {
    const value = this.state[`value-${id}`];
    this.props.updateValue(id, value, namespace, keyName);
  };

  onHandleSelectSave = (idAttr, id, namespace, keyName) => () => {
    const value = this.state[`value-${id}`];
    this.props.SaveNewValue(idAttr, id, value, namespace, keyName);
  };

  setTextInputRef = id => ref => {
    this[`${id}`] = ref;
  };

  onHandleInputRegex = (id, { regex = null }) => e => {
    let regObjMatcher = new RegExp(regex);
    let match = e.target.value.match(regObjMatcher);
    let matched = match && e.target.value === match[0]


    if (matched) {

      this.props.setError(id, false);
    } else {
      this.props.setError(id, true);
    }
  };

  onHandleInput = (item, id) => e => {
    const { value = '' } = e.target;
    if (R.isEmpty(value)) this.props.setError(id, true);
    if (item.hasError && !R.isEmpty(value)) this.props.setError(id, false);
  };
  renderItem = (values, attribute, id, namespace) => {
    return R.isEmpty(attribute.allowedValues)
      ? this.renderTextField(values, attribute, id, namespace)
      : this.renderSelect(values, attribute, id, namespace);
  };

  renderTextField = (values, attribute, id, namespace) => {
    const item = values[id];
    if (item.isEditing) {
      return (
        <>
          <TextField
            type="text"
            margin="normal"
            variant="outlined"
            defaultValue={item.value}
            error={item.hasError}
            fullWidth
            inputRef={this.setTextInputRef(item.id)}
            placeholder={'Enter a value'}
            onChange={
              attribute.format
                ? this.onHandleInputRegex(id, attribute.format)
                : this.onHandleInput(item, id)
            }
          />
          {attribute.format && (
            <Tooltip title={attribute.format.description}>
              <Info color={item.hasError ? 'error' : 'primary'} />
            </Tooltip>
          )}

          <Done
            style={item.hasError ? { color: 'gray' } : { color: 'forestgreen' }}
            onClick={
              item.hasError
                ? null
                : item.isNewValue
                ? this.onHandleSave(attribute.id, id, namespace, attribute.name)
                : this.onHandleUpdate(id, namespace, attribute.name)
            }
          />
          <Clear
            color="primary"
            onClick={this.onHandleCancel(attribute.id, item.id)}
          />
        </>
      );
    }
    return (
      <>
        <ListItemText key={item.id} primary={`${item.value}`} />
        {attribute.editable && (
          <Edit onClick={this.onHandleEdit(attribute.id, id)} />
        )}
        {attribute.editable && (
          <Delete
            color="error"
            onClick={this.onHandleDelete(
              attribute.id,
              id,
              namespace,
              attribute.name,
            )}
          />
        )}
      </>
    );
  };
  handleChange = item => e => {
    if (item.hasError && e.target.value != 'default')
      this.props.setError(item.id, false);
    this.setState({ [`value-${item.id}`]: e.target.value });
  };

  renderSelect = (values, attribute, id, namespace) => {
    const item = values[id];
    if (item.isEditing) {
      return (
        <>
          <Select
            value={this.state[`value-${item.id}`] || item.value || 'default'}
            fullWidth
            input={
              <OutlinedInput
                name={`value-${item.id}`}
                id="application-select"
                labelWidth={0}
              />
            }
            style={{
              marginRight: '25px',
            }}
            onChange={this.handleChange(item)}
          >
            {item.isNewValue && (
              <MenuItem value="default" disabled>
                Select a value
              </MenuItem>
            )}
            {this.renderSelectItems(attribute)}
          </Select>
          <Done
            style={item.hasError ? { color: 'gray' } : { color: 'forestgreen' }}
            onClick={
              item.hasError
                ? null
                : item.isNewValue
                ? this.onHandleSelectSave(
                    attribute.id,
                    id,
                    namespace,
                    attribute.name,
                  )
                : this.onHandleSelectUpdate(id, namespace, attribute.name)
            }
          />
          <Clear
            color="primary"
            onClick={this.onHandleSelectCancel(attribute.id, item.id)}
          />
        </>
      );
    }
    return (
      <>
        <ListItemText key={item.id} primary={`${item.value}`} />
        {attribute.editable && (
          <Edit onClick={this.onHandleEdit(attribute.id, id)} />
        )}
        {attribute.editable && (
          <Delete
            color="error"
            onClick={this.onHandleDelete(
              attribute.id,
              id,
              namespace,
              attribute.name,
            )}
          />
        )}
      </>
    );
  };

  renderSelectItems = attribute => {
    const { allowedValues } = attribute;
    return allowedValues.map(value => (
      <MenuItem value={value}>{value}</MenuItem>
    ));
  };
}

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    position: 'relative',
    overflow: 'auto',
    maxHeight: 360,
    paddingRight: '25px',
  },
  listSection: {
    backgroundColor: 'inherit',
  },
  ul: {
    backgroundColor: 'inherit',
    padding: 0,
  },
  button: {
    transition: theme.transitions.create('background-color', {
      duration: theme.transitions.duration.shortest,
    }),
    '&:hover': {
      textDecoration: 'none',
      backgroundColor: '#fafafa',
      '@media (hover: none)': {
        backgroundColor: 'transparent',
      },
    },
    '&:focus': {
      backgroundColor: '#fafafa',
    },
  },
});

AttributesList.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default connect(
  null,
  actions,
)(withStyles(styles)(AttributesList));
