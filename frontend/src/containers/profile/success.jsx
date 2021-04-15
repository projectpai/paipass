import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import { Link } from 'react-router-dom';

export const SuccessProfile = ({
  hasEmailMessage,
  hasPhoneMessage,
  redirectTo,
}) => {
  const emailTxt = (
    <p>
      An email verification link has been sent to your email address. Please
      click on the link in the email to complete the update of your account's
      email address.
    </p>
  );
  const phoneTxt = <p>Your phone number has been successfully updated.</p>;

  return (
    <section className="success-profile col-xl-4 col-sm-8 mt-5">
      {hasEmailMessage && emailTxt}
      {hasPhoneMessage && phoneTxt}
      <Link to={redirectTo}>
        <Button
          variant="outlined"
          color="primary"
          className="primary mb-1"
          fullWidth
        >
          Return to Dashboard
        </Button>
      </Link>
    </section>
  );
};

SuccessProfile.defaultProps = {
  hasEmailMessage: true,
  hasPhoneMessage: true,
  redirectTo: 'dashboard',
};

SuccessProfile.propTypes = {
  hasEmailMessage: PropTypes.bool,
  hasPhoneMessage: PropTypes.bool,
  redirectTo: PropTypes.string,
};
