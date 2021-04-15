import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InfoIcon from '@material-ui/icons/Info';
import { cond, is, equals, T, F } from 'ramda';
import { Localized, withLocalization } from '@fluent/react';

import './requestedItem.scss';
import { Tooltip } from '../../components/shared/tooltip';
import { SCOPE_APPROVED, SCOPE_DENIED } from '../../entities/AuthorizeDetails';

import {
  READ_OWNER,
  READ,
  READ_WRITE_OWNER,
  READ_WRITE,
} from '../../util';

const switchStyle = () => ({
  switchBase: {
    height: 'auto',
  },
  iconChecked: {
    color: '#0098ff',
  },
});

const StyledSwitch = withStyles(switchStyle)(Switch);

class RequestedItem extends React.Component {
  constructor(props) {
    super(props);

    const defaultChecked = cond([
      [equals(SCOPE_APPROVED), T],
      [equals(SCOPE_DENIED), F],
      [T, F],
    ]);

    this.state = {
      checked: defaultChecked(props.status),
    };
  }

  getPermTooltip = perm => {
    switch (perm) {
      case 'READ_OWNER':
        return <Tooltip title={READ_OWNER}>Access Data (Limited)</Tooltip>;
      case 'READ':
        return <Tooltip title={READ}>Access Data</Tooltip>;
      case 'READ_WRITE_OWNER':
        return (
          <Tooltip title={READ_WRITE_OWNER}>Modify Data (Limited)</Tooltip>
        );
      case 'READ_WRITE':
        return <Tooltip title={READ_WRITE}>Modify Data</Tooltip>;
      default:
        return <Tooltip title={''}>{perm}</Tooltip>;
    }
  };

  formatPermissionsArray = arr => arr.map(this.getPermTooltip);

  renderPermissions = cond([
    [is(Array), this.formatPermissionsArray, e => e.join(',')],
    [is(String), e => this.getPermTooltip(e)],
  ]);

  render() {
    const {
      requestedScope,
      nameApp,
      permissions,
      description,
      className,
      namespace,
      ownerDescription,
      getString,
    } = this.props;
    const { checked } = this.state;
    const name = `scope.${permissions}.${namespace}.${requestedScope}`;

    let scope = requestedScope;
    if (requestedScope.toLowerCase() === 'email'){
      scope = getString('oauth-permission-attribute-name-hack')
    }
    const attribute_description = <Localized id='oauth-permission-attribute-description'
                                       value='This permission gives the requestor the ability to see your {$attribute}'
                                       vars={{attribute: scope}}/>

    return (
      <FormControlLabel
        className={`requested-item ${className}`}
        control={
          <StyledSwitch
            color="primary"
            name={name}
            checked={checked}
            value={checked}
          />
        }
        onChange={this.onChange}
        label={
          <div className="requested-scope text-left">
            <div>
              <b>{scope}</b>
              <span>
                <Localized id="oauth-permission-attribute"
                           value="(from { $application }"
                           vars={{attribute:scope, application:nameApp}} />
                <Tooltip title={ownerDescription}>
                  <InfoIcon />
                </Tooltip>
                )
              </span>
            </div>
            <span>{this.renderPermissions(permissions)}</span>
            <div>
              <b>{attribute_description}</b>
            </div>
          </div>
        }
      />
    );
  }

  onChange = e => {
    const checked = !this.state.checked;
    this.setState({ checked });
    this.props.onChange && this.props.onChange(e.target.name, checked);
  };
}

RequestedItem.defaultProps = {
  ownerDescription: 'PaiPass',
  nameApp: 'PaiPass',
};

RequestedItem.propTypes = {
  requestedScope: PropTypes.string.isRequired,
  nameApp: PropTypes.string.isRequired,
  permissions: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  description: PropTypes.string.isRequired,
  className: PropTypes.string,
  namespace: PropTypes.string,
  ownerDescription: PropTypes.string.isRequired,
  status: PropTypes.string,
  onChange: PropTypes.func,
  getString: PropTypes.func
};

export default withLocalization(RequestedItem);
