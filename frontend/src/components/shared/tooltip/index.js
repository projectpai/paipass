import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import TooltipMaterial from '@material-ui/core/Tooltip';
import Fade from '@material-ui/core/Fade';
import {Localized} from '@fluent/react';

const tooltipStyle = theme => ({
  tooltip: {
    backgroundColor: theme.palette.grey[700],
    color: 'white',
    boxShadow: theme.shadows[1],
    fontSize: 12,
  },
});

const StyledTooltip = withStyles(tooltipStyle)(TooltipMaterial);

export class Tooltip extends React.Component {
  render() {
    const { children, title } = this.props;
    let children_l10n = children;
    if (children === 'Access Data') {
      children_l10n = <Localized id="access-data" value="Access Data"/>
    }
    return (
      <StyledTooltip title={title} interactive TransitionComponent={Fade}>
        <span>{children_l10n}</span>
      </StyledTooltip>
    );
  }

  onClose = () => this.setState({ open: false });
  onOpen = () => this.setState({ open: true });
}

Tooltip.propTypes = {
  title: PropTypes.string.isRequired,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
};
