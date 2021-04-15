import React, { Fragment } from 'react';
import FlexView from 'react-flexview';
import { Button, Intent } from '@blueprintjs/core';

const ResetPasswordDialog = ({ onReset }) => {
    return (
        <Fragment>
            <FlexView column hAlignContent="center">
                <span>Are you sure you want to reset password?</span>    
                <br/>
                <small>You will recive email after confirmation.</small>
            </FlexView>

            <FlexView marginLeft="auto" marginRight="auto" marginTop="8px">
                <Button
                    intent={Intent.PRIMARY}
                    text="Reset password" 
                    onClick={onReset} 
                />  
            </FlexView>
        </Fragment>
    );
};

export default ResetPasswordDialog;