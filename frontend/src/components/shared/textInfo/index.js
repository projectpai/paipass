import React from 'react';
import PropTypes from 'prop-types';

import './textInfo.scss';

export const TextInfo = ({ message, icon, children}) => {
  return (
    <div className="input-info">
      {icon} {message}
      {children}
    </div>
  );
};

TextInfo.propTypes = {
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
  ]).isRequired,
  icon: PropTypes.node.isRequired,
  children: PropTypes.node,
};
